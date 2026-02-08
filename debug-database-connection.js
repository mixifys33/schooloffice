/**
 * Database Connection Diagnostic Script
 * 
 * This script helps diagnose and fix MongoDB Atlas connection issues
 */

const { MongoClient } = require('mongodb');
const dns = require('dns');
const https = require('https');
const { promisify } = require('util');

// Load environment variables
require('dotenv').config();

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

async function testDNSResolution() {
  console.log('\n🔍 Testing DNS Resolution...');
  
  const hostname = 'schooloffice.jshbhxm.mongodb.net';
  
  try {
    // Test b