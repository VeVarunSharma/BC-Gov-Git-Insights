targetScope = 'resourceGroup'

param alertEmails array
param amount int
param name string

resource budget 'Microsoft.Consumption/budgets@2024-08-01' = {
  name: name
  properties: {
    amount: amount
    category: 'Cost'
    notifications: {
      actual: {
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
        ]
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
      }
      forecast: {
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
        ]
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
      }
    }
    timeGrain: 'Monthly'
    timePeriod: {
      endDate: '2036-08-01'
      startDate: '2026-08-01'
    }
  }
}
