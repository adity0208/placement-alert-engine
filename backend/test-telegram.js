import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    console.log('Testing Telegram connection...\n');

    const { API_ID, API_HASH, SESSION_STRING } = process.env;

    if (!API_ID || !API_HASH || !SESSION_STRING) {
        console.error('❌ Missing credentials in .env file');
        process.exit(1);
    }

    console.log('✅ Credentials found');
    console.log(`API_ID: ${API_ID}`);
    console.log(`SESSION_STRING length: ${SESSION_STRING.length} characters\n`);

    const session = new StringSession(SESSION_STRING);
    const client = new TelegramClient(session, parseInt(API_ID), API_HASH, {
        connectionRetries: 3,
        timeout: 10000, // 10 second timeout
    });

    try {
        console.log('Attempting to connect to Telegram...');
        await client.connect();
        console.log('✅ Successfully connected to Telegram!');

        // Test if we can get our own info
        const me = await client.getMe();
        console.log(`\n✅ Logged in as: ${me.firstName} ${me.lastName || ''}`);
        console.log(`   Phone: ${me.phone}`);
        console.log(`   Username: @${me.username || 'N/A'}`);

        await client.disconnect();
        console.log('\n✅ Connection test successful!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('\nPossible solutions:');
        console.error('1. Check if your network/firewall is blocking Telegram');
        console.error('2. Try using a VPN');
        console.error('3. Regenerate your SESSION_STRING (run: npm run generate-session)');
        console.error('4. Check if your ISP blocks Telegram');
        process.exit(1);
    }
}

testConnection();
