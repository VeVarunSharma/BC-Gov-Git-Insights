targetScope = 'resourceGroup'

param applicationInsightsConnectionString string
param allowedTenantIdsCsv string
param configureEntraAuth bool
param publicDashboard bool = false
param containerAppEnvironmentId string
param entraClientId string
param entraClientSecretUrl string
param entraOpenIdIssuer string
param enableScheduledJobs bool
param foundryModelName string
param foundryModelVersion string
param foundryEndpoint string
param foundryProjectId string
param configureGitHubOAuth bool
param registryServer string
param collectorIdentityClientId string
param collectorIdentityResourceId string
param databaseAdminIdentityClientId string
param databaseAdminIdentityName string
param databaseAdminIdentityResourceId string
param databaseBootstrapJobName string
param githubOAuthClientId string
param githubOAuthClientSecretUrl string
param metadataJobEnvironment array
param metadataJobImage string
param metadataJobName string
param postgresqlDatabaseName string
param postgresqlHost string
param postgresqlUser string
param scannerIdentityClientId string
param scannerIdentityResourceId string
param scanJobEnvironment array
param scanJobImage string
param scanJobName string
param storageAccountName string
param synthesisJobEnvironment array
param synthesisJobImage string
param synthesisJobName string
param synthesisIdentityClientId string
param synthesisIdentityResourceId string
param tags object
param webAppName string
param webEnvironment array
param webIdentityClientId string
param webIdentityName string
param webIdentityPrincipalId string
param webIdentityResourceId string
param webImage string

var commonEnvironment = [
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: applicationInsightsConnectionString
  }
  {
    name: 'AZURE_STORAGE_ACCOUNT_NAME'
    value: storageAccountName
  }
]

var webRuntimeEnvironment = [
  {
    name: 'AZURE_CLIENT_ID'
    value: webIdentityClientId
  }
  {
    name: 'ALLOWED_TENANT_IDS'
    value: allowedTenantIdsCsv
  }
  {
    name: 'ENTRA_CLIENT_ID'
    value: entraClientId
  }
  {
    name: 'EASY_AUTH_ENABLED'
    value: toLower(string(configureEntraAuth))
  }
  {
    name: 'PUBLIC_DASHBOARD'
    value: toLower(string(publicDashboard))
  }
  {
    name: 'PGHOST'
    value: postgresqlHost
  }
  {
    name: 'PGPORT'
    value: '5432'
  }
  {
    name: 'PGDATABASE'
    value: postgresqlDatabaseName
  }
  {
    name: 'PGUSER'
    value: postgresqlUser
  }
  {
    name: 'PGPOOL_MAX'
    value: '5'
  }
]

var metadataRuntimeEnvironment = concat([
  {
    name: 'AZURE_CLIENT_ID'
    value: collectorIdentityClientId
  }
], configureGitHubOAuth ? [
  {
    name: 'GITHUB_OAUTH_CLIENT_ID'
    value: githubOAuthClientId
  }
  {
    name: 'GITHUB_OAUTH_CLIENT_SECRET'
    secretRef: 'github-oauth-client-secret'
  }
] : [])

var databaseBootstrapEnvironment = [
  {
    name: 'AZURE_CLIENT_ID'
    value: databaseAdminIdentityClientId
  }
  {
    name: 'PGHOST'
    value: postgresqlHost
  }
  {
    name: 'PGPORT'
    value: '5432'
  }
  {
    name: 'PGDATABASE'
    value: postgresqlDatabaseName
  }
  {
    name: 'PGUSER'
    value: databaseAdminIdentityName
  }
  {
    name: 'PGPOOL_MAX'
    value: '2'
  }
  {
    name: 'WEB_IDENTITY_NAME'
    value: webIdentityName
  }
  {
    name: 'WEB_IDENTITY_OBJECT_ID'
    value: webIdentityPrincipalId
  }
]

var scannerRuntimeEnvironment = [
  {
    name: 'AZURE_CLIENT_ID'
    value: scannerIdentityClientId
  }
]

var synthesisRuntimeEnvironment = [
  {
    name: 'AZURE_CLIENT_ID'
    value: synthesisIdentityClientId
  }
  {
    name: 'AZURE_AI_PROJECT_ENDPOINT'
    value: foundryEndpoint
  }
  {
    name: 'AZURE_AI_PROJECT_ID'
    value: foundryProjectId
  }
  {
    name: 'AZURE_AI_MODEL'
    value: foundryModelName
  }
  {
    name: 'AZURE_AI_MODEL_VERSION'
    value: foundryModelVersion
  }
]

resource webApp 'Microsoft.App/containerApps@2025-01-01' = {
  name: webAppName
  location: resourceGroup().location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${webIdentityResourceId}': {}
    }
  }
  properties: {
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: configureEntraAuth || publicDashboard
        targetPort: 3000
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        transport: 'auto'
      }
      secrets: configureEntraAuth ? [
        {
          identity: webIdentityResourceId
          keyVaultUrl: entraClientSecretUrl
          name: 'entra-client-secret'
        }
      ] : []
      registries: [
        {
          identity: webIdentityResourceId
          server: registryServer
        }
      ]
    }
    environmentId: containerAppEnvironmentId
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          env: concat(commonEnvironment, webRuntimeEnvironment, webEnvironment)
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/healthz'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/healthz'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 3
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        maxReplicas: 5
        minReplicas: 1
      }
    }
  }
}

resource webAuth 'Microsoft.App/containerApps/authConfigs@2025-01-01' = if (configureEntraAuth) {
  parent: webApp
  name: 'current'
  properties: {
    globalValidation: {
      excludedPaths: [
        '/api/health'
        '/healthz'
      ]
      redirectToProvider: 'azureactivedirectory'
      unauthenticatedClientAction: 'RedirectToLoginPage'
    }
    httpSettings: {
      requireHttps: true
      routes: {
        apiPrefix: '/.auth'
      }
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          clientSecretSettingName: 'entra-client-secret'
          openIdIssuer: entraOpenIdIssuer
        }
        validation: {
          allowedAudiences: [
            entraClientId
          ]
        }
      }
    }
    platform: {
      enabled: true
    }
  }
}

resource metadataJob 'Microsoft.App/jobs@2025-01-01' = {
  name: metadataJobName
  location: resourceGroup().location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${collectorIdentityResourceId}': {}
    }
  }
  properties: {
    configuration: union({
      registries: [
        {
          identity: collectorIdentityResourceId
          server: registryServer
        }
      ]
      replicaRetryLimit: 1
      replicaTimeout: 3600
      triggerType: enableScheduledJobs ? 'Schedule' : 'Manual'
    }, enableScheduledJobs ? {
      scheduleTriggerConfig: {
        cronExpression: '0 2 * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
    } : {}, {
      secrets: configureGitHubOAuth ? [
        {
          identity: collectorIdentityResourceId
          keyVaultUrl: githubOAuthClientSecretUrl
          name: 'github-oauth-client-secret'
        }
      ] : []
    })
    environmentId: containerAppEnvironmentId
    template: {
      containers: [
        {
          name: 'metadata'
          image: metadataJobImage
          env: concat(commonEnvironment, metadataRuntimeEnvironment, metadataJobEnvironment)
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
    }
  }
}

resource databaseBootstrapJob 'Microsoft.App/jobs@2025-01-01' = {
  name: databaseBootstrapJobName
  location: resourceGroup().location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${databaseAdminIdentityResourceId}': {}
    }
  }
  properties: {
    configuration: {
      registries: [
        {
          identity: databaseAdminIdentityResourceId
          server: registryServer
        }
      ]
      replicaRetryLimit: 0
      replicaTimeout: 1800
      triggerType: 'Manual'
    }
    environmentId: containerAppEnvironmentId
    template: {
      containers: [
        {
          name: 'database-bootstrap'
          image: metadataJobImage
          command: [
            './node_modules/.bin/tsx'
          ]
          args: [
            'src/bootstrap-database.ts'
          ]
          env: concat(commonEnvironment, databaseBootstrapEnvironment)
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
    }
  }
}

resource scanJob 'Microsoft.App/jobs@2025-01-01' = {
  name: scanJobName
  location: resourceGroup().location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${scannerIdentityResourceId}': {}
    }
  }
  properties: {
    configuration: union({
      registries: [
        {
          identity: scannerIdentityResourceId
          server: registryServer
        }
      ]
      replicaRetryLimit: 1
      replicaTimeout: 21600
      triggerType: enableScheduledJobs ? 'Schedule' : 'Manual'
    }, enableScheduledJobs ? {
      scheduleTriggerConfig: {
        cronExpression: '0 3 * * 0'
        parallelism: 1
        replicaCompletionCount: 1
      }
    } : {})
    environmentId: containerAppEnvironmentId
    template: {
      containers: [
        {
          name: 'scanner'
          image: scanJobImage
          env: concat(commonEnvironment, scannerRuntimeEnvironment, scanJobEnvironment)
          resources: {
            cpu: json('2')
            memory: '4Gi'
          }
        }
      ]
    }
  }
}

resource synthesisJob 'Microsoft.App/jobs@2025-01-01' = {
  name: synthesisJobName
  location: resourceGroup().location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${synthesisIdentityResourceId}': {}
    }
  }
  properties: {
    configuration: union({
      registries: [
        {
          identity: synthesisIdentityResourceId
          server: registryServer
        }
      ]
      replicaRetryLimit: 1
      replicaTimeout: 21600
      triggerType: enableScheduledJobs ? 'Schedule' : 'Manual'
    }, enableScheduledJobs ? {
      scheduleTriggerConfig: {
        cronExpression: '0 2 * * 1'
        parallelism: 1
        replicaCompletionCount: 1
      }
    } : {})
    environmentId: containerAppEnvironmentId
    template: {
      containers: [
        {
          name: 'synthesizer'
          image: synthesisJobImage
          env: concat(commonEnvironment, synthesisRuntimeEnvironment, synthesisJobEnvironment)
          resources: {
            cpu: json('1')
            memory: '2Gi'
          }
        }
      ]
    }
  }
}

output webAppUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output metadataJobId string = metadataJob.id
output databaseBootstrapJobId string = databaseBootstrapJob.id
output scanJobId string = scanJob.id
output synthesisJobId string = synthesisJob.id
