targetScope = 'resourceGroup'

param databaseName string
param location string
param administratorIdentityName string
param administratorIdentityPrincipalId string
param serverName string
param tags object
param tenantId string

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_D2ds_v5'
    tier: 'GeneralPurpose'
  }
  tags: tags
  properties: {
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: tenantId
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    storage: {
      autoGrow: 'Enabled'
      storageSizeGB: 128
    }
    version: '16'
  }
}

resource entraAdministrator 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2025-08-01' = {
  parent: server
  name: administratorIdentityPrincipalId
  properties: {
    principalName: administratorIdentityName
    principalType: 'ServicePrincipal'
    tenantId: tenantId
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = {
  parent: server
  name: 'AllowAzureServices'
  properties: {
    endIpAddress: '0.0.0.0'
    startIpAddress: '0.0.0.0'
  }
}

output id string = server.id
output fullyQualifiedDomainName string = server.properties.fullyQualifiedDomainName
