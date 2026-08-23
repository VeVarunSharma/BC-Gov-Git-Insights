targetScope = 'subscription'

@description('Azure region for all regional resources.')
param location string = 'canadacentral'

@description('Name of the workload resource group.')
param resourceGroupName string = 'rg-bcgov-opengit-prod'

@description('Resource tags applied to all supported resources.')
param tags object = {
  application: 'bcgov-opengit-ministry'
  environment: 'production'
  'managed-by': 'bicep'
  'data-classification': 'internal'
}

param webIdentityName string = 'id-opengit-web-prod'
param collectorIdentityName string = 'id-opengit-collector-prod'
param scannerIdentityName string = 'id-opengit-scanner-prod'
param synthesisIdentityName string = 'id-opengit-synthesis-prod'
param databaseAdminIdentityName string = 'id-opengit-dbadmin-prod'
param containerRegistryName string = 'cropengitprod'
param logAnalyticsWorkspaceName string = 'log-bcgov-opengit-prod'
param applicationInsightsName string = 'appi-bcgov-opengit-prod'
param keyVaultName string = 'kv-opengit-prod'
param storageAccountName string = 'stbcgovopengitprod'
param postgresqlServerName string = 'psql-bcgov-opengit-prod'
param postgresqlDatabaseName string = 'gitinsights'
param foundryAccountName string = 'aif-bcgov-opengit-prod'
param foundryProjectName string = 'proj-bcgov-opengit-prod'
param foundryProjectDisplayName string = 'BC Gov OpenGit Ministry'
param foundryCustomSubdomainName string = 'aif-bcgov-opengit-prod'
param containerAppEnvironmentName string = 'cae-bcgov-opengit-prod'
param webAppName string = 'ca-bcgov-opengit-prod'
param metadataJobName string = 'caj-opengit-metadata-prod'
param databaseBootstrapJobName string = 'caj-opengit-dbbootstrap-prod'
param scanJobName string = 'caj-opengit-scan-prod'
param synthesisJobName string = 'caj-opengit-ai-prod'

@description('Enable Azure Container Apps built-in Microsoft Entra authentication after the multitenant app and Key Vault secret exist.')
param configureEntraAuth bool = false

@description('Serve the dashboard anonymously with external ingress. v1 only: unset before security findings are surfaced in the UI. See docs/security/threat-model.md.')
param publicDashboard bool = false

@description('Client ID of the multitenant Entra web application.')
param entraClientId string = ''

@description('Key Vault secret URI containing the Entra web application client secret.')
param entraClientSecretUrl string = ''

@description('OpenID issuer for the multitenant Entra application.')
param entraOpenIdIssuer string = '${environment().authentication.loginEndpoint}organizations/v2.0'

@description('Comma-separated Entra tenant IDs authorized by the application. Authorization is revalidated in Next.js.')
param allowedTenantIdsCsv string = ''

@description('Bind the project-owned GitHub OAuth App secret to the metadata job after the Key Vault secret exists.')
param configureGitHubOAuth bool = false

@description('Enable recurring metadata, scan, and synthesis schedules after secrets, database bootstrap, and Foundry model configuration are complete.')
param enableScheduledJobs bool = false

@description('Client ID of the project-owned GitHub OAuth App.')
param githubOAuthClientId string = ''

@description('Key Vault secret URI containing the GitHub OAuth App client secret.')
param githubOAuthClientSecretUrl string = ''

@description('Public, immutable GHCR image reference for the web Container App.')
param webImage string

@description('Public, immutable GHCR image reference for the metadata job.')
param metadataJobImage string

@description('Public, immutable GHCR image reference for the scanner job.')
param scanJobImage string

@description('Public, immutable GHCR image reference for the synthesizer job.')
param synthesisJobImage string

@description('Additional non-secret environment variables for the web Container App.')
param webEnvironment array = [
  {
    name: 'PORT'
    value: '3000'
  }
]

@description('Additional non-secret environment variables for the metadata job.')
param metadataJobEnvironment array = []

@description('Additional non-secret environment variables for the scanner job.')
param scanJobEnvironment array = []

@description('Additional non-secret environment variables for the synthesis job.')
param synthesisJobEnvironment array = []

@description('Deploy a Foundry model only after selecting a supported model and confirming regional quota.')
param deployFoundryModel bool = false

@description('Foundry account deployment name when deployFoundryModel is true.')
param foundryModelDeploymentName string = ''

@description('Foundry model name when deployFoundryModel is true.')
param foundryModelName string = ''

@description('Foundry model version when deployFoundryModel is true.')
param foundryModelVersion string = ''

@description('Foundry model format when deployFoundryModel is true.')
param foundryModelFormat string = 'OpenAI'

@description('Foundry model SKU name when deployFoundryModel is true.')
param foundryModelSkuName string = 'GlobalStandard'

@description('Foundry model capacity when deployFoundryModel is true.')
param foundryModelCapacity int = 1

@description('Create the resource-group budget guardrail.')
param deployBudget bool = true

@description('Monthly resource-group budget in the billing currency.')
param monthlyBudgetAmount int = 500

@description('Email addresses that receive budget alerts. Leave empty to rely on resource-group Owner alerts.')
param budgetAlertEmails array = []

var globalNameSuffix = take(uniqueString(subscription().id, resourceGroupName, location), 6)
var effectiveKeyVaultName = '${keyVaultName}-${globalNameSuffix}'
var effectiveStorageAccountName = '${storageAccountName}${globalNameSuffix}'
var effectivePostgresqlServerName = '${postgresqlServerName}-${globalNameSuffix}'
var effectiveFoundryAccountName = '${foundryAccountName}-${globalNameSuffix}'
var effectiveFoundryCustomSubdomainName = '${foundryCustomSubdomainName}-${globalNameSuffix}'
var effectiveContainerRegistryName = '${containerRegistryName}${globalNameSuffix}'

resource workloadResourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module webIdentity './modules/identity.bicep' = {
  name: 'webIdentity'
  scope: workloadResourceGroup
  params: {
    location: location
    name: webIdentityName
    tags: tags
  }
}

module collectorIdentity './modules/identity.bicep' = {
  name: 'collectorIdentity'
  scope: workloadResourceGroup
  params: {
    location: location
    name: collectorIdentityName
    tags: tags
  }
}

module scannerIdentity './modules/identity.bicep' = {
  name: 'scannerIdentity'
  scope: workloadResourceGroup
  params: {
    location: location
    name: scannerIdentityName
    tags: tags
  }
}

module synthesisIdentity './modules/identity.bicep' = {
  name: 'synthesisIdentity'
  scope: workloadResourceGroup
  params: {
    location: location
    name: synthesisIdentityName
    tags: tags
  }
}

module databaseAdminIdentity './modules/identity.bicep' = {
  name: 'databaseAdminIdentity'
  scope: workloadResourceGroup
  params: {
    location: location
    name: databaseAdminIdentityName
    tags: tags
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: workloadResourceGroup
  params: {
    applicationInsightsName: applicationInsightsName
    location: location
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
    tags: tags
  }
}

module storage './modules/storage.bicep' = {
  name: 'evidenceStorage'
  scope: workloadResourceGroup
  params: {
    collectorPrincipalId: collectorIdentity.outputs.principalId
    location: location
    name: effectiveStorageAccountName
    scannerPrincipalId: scannerIdentity.outputs.principalId
    synthesisPrincipalId: synthesisIdentity.outputs.principalId
    tags: tags
    webPrincipalId: webIdentity.outputs.principalId
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'keyVault'
  scope: workloadResourceGroup
  params: {
    location: location
    name: effectiveKeyVaultName
    secretReaderPrincipalIds: [
      webIdentity.outputs.principalId
      collectorIdentity.outputs.principalId
    ]
    tags: tags
    tenantId: tenant().tenantId
  }
}

module postgresql './modules/postgresql.bicep' = {
  name: 'postgresql'
  scope: workloadResourceGroup
  params: {
    databaseName: postgresqlDatabaseName
    location: location
    administratorIdentityName: databaseAdminIdentityName
    administratorIdentityPrincipalId: databaseAdminIdentity.outputs.principalId
    serverName: effectivePostgresqlServerName
    tags: tags
    tenantId: tenant().tenantId
  }
}

module foundry './modules/foundry.bicep' = {
  name: 'foundry'
  scope: workloadResourceGroup
  params: {
    accountName: effectiveFoundryAccountName
    customSubdomainName: effectiveFoundryCustomSubdomainName
    deployModel: deployFoundryModel
    location: location
    modelCapacity: foundryModelCapacity
    modelDeploymentName: foundryModelDeploymentName
    modelFormat: foundryModelFormat
    modelName: foundryModelName
    modelSkuName: foundryModelSkuName
    modelVersion: foundryModelVersion
    projectDisplayName: foundryProjectDisplayName
    projectName: foundryProjectName
    synthesisIdentityPrincipalId: synthesisIdentity.outputs.principalId
    tags: tags
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'containerRegistry'
  scope: workloadResourceGroup
  params: {
    location: location
    name: effectiveContainerRegistryName
    pullPrincipalIds: [
      webIdentity.outputs.principalId
      collectorIdentity.outputs.principalId
      scannerIdentity.outputs.principalId
      synthesisIdentity.outputs.principalId
      databaseAdminIdentity.outputs.principalId
    ]
    tags: tags
  }
}

module containerEnvironment './modules/container-environment.bicep' = {
  name: 'containerEnvironment'
  scope: workloadResourceGroup
  params: {
    location: location
    logAnalyticsWorkspaceId: monitoring.outputs.workspaceId
    name: containerAppEnvironmentName
    tags: tags
  }
}

module compute './modules/container-workloads.bicep' = {
  name: 'containerWorkloads'
  scope: workloadResourceGroup
  params: {
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    allowedTenantIdsCsv: allowedTenantIdsCsv
    collectorIdentityClientId: collectorIdentity.outputs.clientId
    collectorIdentityResourceId: collectorIdentity.outputs.id
    databaseAdminIdentityClientId: databaseAdminIdentity.outputs.clientId
    databaseAdminIdentityResourceId: databaseAdminIdentity.outputs.id
    databaseAdminIdentityName: databaseAdminIdentityName
    databaseBootstrapJobName: databaseBootstrapJobName
    configureEntraAuth: configureEntraAuth
    publicDashboard: publicDashboard
    containerAppEnvironmentId: containerEnvironment.outputs.id
    entraClientId: entraClientId
    entraClientSecretUrl: entraClientSecretUrl
    entraOpenIdIssuer: entraOpenIdIssuer
    enableScheduledJobs: enableScheduledJobs
    foundryModelName: foundryModelDeploymentName
    foundryModelVersion: foundryModelVersion
    foundryEndpoint: foundry.outputs.projectEndpoint
    foundryProjectId: foundry.outputs.projectId
    configureGitHubOAuth: configureGitHubOAuth
    githubOAuthClientId: githubOAuthClientId
    githubOAuthClientSecretUrl: githubOAuthClientSecretUrl
    metadataJobEnvironment: metadataJobEnvironment
    metadataJobImage: metadataJobImage
    metadataJobName: metadataJobName
    postgresqlDatabaseName: postgresqlDatabaseName
    postgresqlHost: postgresql.outputs.fullyQualifiedDomainName
    postgresqlUser: webIdentityName
    registryServer: containerRegistry.outputs.loginServer
    scannerIdentityClientId: scannerIdentity.outputs.clientId
    scannerIdentityResourceId: scannerIdentity.outputs.id
    scanJobEnvironment: scanJobEnvironment
    scanJobImage: scanJobImage
    scanJobName: scanJobName
    storageAccountName: effectiveStorageAccountName
    synthesisJobEnvironment: synthesisJobEnvironment
    synthesisJobImage: synthesisJobImage
    synthesisJobName: synthesisJobName
    synthesisIdentityClientId: synthesisIdentity.outputs.clientId
    synthesisIdentityResourceId: synthesisIdentity.outputs.id
    tags: tags
    webAppName: webAppName
    webEnvironment: webEnvironment
    webIdentityClientId: webIdentity.outputs.clientId
    webIdentityName: webIdentityName
    webIdentityPrincipalId: webIdentity.outputs.principalId
    webIdentityResourceId: webIdentity.outputs.id
    webImage: webImage
  }
}

module budget './modules/budget.bicep' = if (deployBudget) {
  name: 'budget'
  scope: workloadResourceGroup
  params: {
    alertEmails: budgetAlertEmails
    amount: monthlyBudgetAmount
    name: 'budget-bcgov-opengit-prod'
  }
}

output resourceGroupId string = workloadResourceGroup.id
output resourceGroupName string = workloadResourceGroup.name
output webIdentityClientId string = webIdentity.outputs.clientId
output collectorIdentityClientId string = collectorIdentity.outputs.clientId
output scannerIdentityClientId string = scannerIdentity.outputs.clientId
output synthesisIdentityClientId string = synthesisIdentity.outputs.clientId
output databaseAdminIdentityClientId string = databaseAdminIdentity.outputs.clientId
output keyVaultUri string = keyVault.outputs.uri
output keyVaultName string = effectiveKeyVaultName
output storageBlobEndpoint string = storage.outputs.primaryBlobEndpoint
output storageAccountName string = effectiveStorageAccountName
output postgresqlHost string = postgresql.outputs.fullyQualifiedDomainName
output postgresqlServerName string = effectivePostgresqlServerName
output applicationInsightsConnectionString string = monitoring.outputs.applicationInsightsConnectionString
output foundryEndpoint string = foundry.outputs.endpoint
output foundryProjectEndpoint string = foundry.outputs.projectEndpoint
output foundryAccountName string = effectiveFoundryAccountName
output containerRegistryName string = containerRegistry.outputs.name
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output foundryProjectId string = foundry.outputs.projectId
output containerAppEnvironmentId string = containerEnvironment.outputs.id
output webAppUrl string = compute.outputs.webAppUrl
output metadataJobId string = compute.outputs.metadataJobId
output databaseBootstrapJobId string = compute.outputs.databaseBootstrapJobId
output scanJobId string = compute.outputs.scanJobId
output synthesisJobId string = compute.outputs.synthesisJobId
