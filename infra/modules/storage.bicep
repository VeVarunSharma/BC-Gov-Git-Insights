targetScope = 'resourceGroup'

param location string
param name string
param collectorPrincipalId string
param scannerPrincipalId string
param synthesisPrincipalId string
param webPrincipalId string
param tags object

var storageBlobDataContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var storageBlobDataReaderRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1')
var containerNames = [
  'raw'
  'control'
  'manifests'
  'artifacts'
  'evidence'
  'analysis'
  'exports'
]

resource storageAccount 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: name
  location: location
  sku: {
    name: 'Standard_ZRS'
  }
  kind: 'StorageV2'
  tags: tags
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    isHnsEnabled: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-06-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource containers 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = [for containerName in containerNames: {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
  }
}]

var containerAccessGrants = [
  // Collector owns source metadata and immutable/current scan plans.
  {
    containerIndex: 0
    principalId: collectorPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  {
    containerIndex: 1
    principalId: collectorPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  // Scanner can read plans, and write only scan artifacts and run manifests.
  {
    containerIndex: 1
    principalId: scannerPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 2
    principalId: scannerPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  {
    containerIndex: 3
    principalId: scannerPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  // Synthesizer reads completed plans/scans and writes AI output and run manifests.
  {
    containerIndex: 1
    principalId: synthesisPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 2
    principalId: synthesisPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  {
    containerIndex: 3
    principalId: synthesisPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 5
    principalId: synthesisPrincipalId
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
  // Dashboard gets read-only curated evidence and output, never raw/control data.
  {
    containerIndex: 2
    principalId: webPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 3
    principalId: webPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 4
    principalId: webPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 5
    principalId: webPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
  {
    containerIndex: 6
    principalId: webPrincipalId
    roleDefinitionId: storageBlobDataReaderRoleDefinitionId
  }
]

resource containerRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for grant in containerAccessGrants: {
  name: guid(containers[grant.containerIndex].id, grant.principalId, grant.roleDefinitionId)
  scope: containers[grant.containerIndex]
  properties: {
    principalId: grant.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: grant.roleDefinitionId
  }
}]

output id string = storageAccount.id
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
