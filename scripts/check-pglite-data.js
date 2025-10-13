/**
 * Emergency script to check PGlite data
 * Run this in browser console if expenses disappeared
 */

import { localDB } from '../src/lib/pglite.js'

async function checkPGliteData() {
  try {
    console.log('🔍 Checking PGlite database...')

    // Get all expenses from PGlite
    const result = await localDB.query('SELECT * FROM expenses ORDER BY id DESC')

    console.log(`📊 Found ${result.rows.length} expenses in PGlite:`)
    console.table(result.rows)

    // Get all settings from PGlite
    const settingsResult = await localDB.query('SELECT * FROM settings')
    console.log('⚙️ Settings in PGlite:')
    console.table(settingsResult.rows)

    return {
      expenses: result.rows,
      settings: settingsResult.rows
    }
  } catch (error) {
    console.error('❌ Error checking PGlite:', error)
    return null
  }
}

// Run the check
checkPGliteData()
