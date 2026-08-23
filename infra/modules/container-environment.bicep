targetScope = 'resourceGroup'

param location string
param logAnalyticsWorkspaceId string
param name string
param tags object

resource environment 'Microsoft.App/managedEnvironments@2025-02-02-preview' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2025-02-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2025-02-01').primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

output id string = environment.id
output defaultDomain string = environment.properties.defaultDomain
