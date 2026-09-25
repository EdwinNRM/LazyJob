import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
 testDir: './e2e', fullyParallel: false, workers: 1, timeout: 45000,
 expect: { timeout: 15000 }, reporter: [['list'],['html',{open:'never'}]],
 use: { baseURL: 'http://127.0.0.1:4317', trace: 'retain-on-failure', screenshot: 'only-on-failure',
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
 projects: [{ name:'desktop',use:{...devices['Desktop Chrome']} },{ name:'mobile',use:{ viewport:{width:390,height:844},isMobile:true,hasTouch:true } }],
 webServer: { command: 'node ../scripts/e2e-server.cjs', url:'http://127.0.0.1:4317/api/health', reuseExistingServer:false, timeout:90000 },
})
