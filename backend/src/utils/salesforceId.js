// Salesforce record ids are 15 or 18 alphanumeric characters
export function isSalesforceId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/.test(value)
}
