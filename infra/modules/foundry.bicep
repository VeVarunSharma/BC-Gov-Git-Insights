targetScope = 'resourceGroup'

param accountName string
param customSubdomainName string
param deployModel bool
param location string
param modelCapacity int
param modelDeploymentName string
param modelFormat string
param modelName string
param modelSkuName string
param modelVersion string
param projectDisplayName string
param projectName string
param synthesisIdentityPrincipalId string
param tags object

var cognitiveServicesOpenAIUserRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  kind: 'AIServices'
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'S0'
  }
  tags: tags
  properties: {
    allowProjectManagement: true
    customSubDomainName: customSubdomainName
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: account
  name: projectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: projectDisplayName
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = if (deployModel) {
  parent: account
  name: modelDeploymentName
  sku: {
    capacity: modelCapacity
    name: modelSkuName
  }
  properties: {
    model: {
      format: modelFormat
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [
    project
  ]
}

resource synthesisFoundryUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, synthesisIdentityPrincipalId, cognitiveServicesOpenAIUserRoleDefinitionId)
  scope: account
  properties: {
    principalId: synthesisIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: cognitiveServicesOpenAIUserRoleDefinitionId
  }
}

output id string = account.id
output endpoint string = account.properties.endpoint
output projectId string = project.id
output projectEndpoint string = 'https://${customSubdomainName}.services.ai.azure.com/api/projects/${projectName}'
