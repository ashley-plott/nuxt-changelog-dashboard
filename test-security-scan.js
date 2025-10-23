// test-security-scan.js
const testUrl = 'https://example.com'

async function testSecurityScan() {
  try {
    console.log('Testing security scan for:', testUrl)
    
    const response = await fetch('http://localhost:3000/api/security/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify({
        url: testUrl,
        checks: ['https', 'headers', 'content']
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('Security scan result:')
    console.log(JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('Security scan failed:', error.message)
  }
}

testSecurityScan()