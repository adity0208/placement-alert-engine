import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

/**
 * Helper script to generate Telegram session string
 * Run this once to get your SESSION_STRING for .env
 */

async function generateSession() {
    console.log('\n🔐 Telegram Session String Generator\n');
    console.log('This script will help you generate a session string for your .env file.\n');

    // Get API credentials
    const apiId = await input.text('Enter your API_ID from https://my.telegram.org/apps: ');
    const apiHash = await input.text('Enter your API_HASH: ');
    const phoneNumber = await input.text('Enter your phone number (with country code, e.g., +1234567890): ');

    const session = new StringSession('');
    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
        connectionRetries: 5,
    });

    try {
        console.log('\n🔄 Connecting to Telegram...');
        await client.start({
            phoneNumber: async () => phoneNumber,
            password: async () => await input.text('Enter your 2FA password (if enabled): '),
            phoneCode: async () => await input.text('Enter the code you received: '),
            onError: (err) => console.error('Error:', err),
        });

        console.log('\n✅ Successfully authenticated!');

        const sessionString = client.session.save();

        console.log('\n📋 Your SESSION_STRING:');
        console.log('━'.repeat(80));
        console.log(sessionString);
        console.log('━'.repeat(80));

        console.log('\n💡 Add this to your .env file:');
        console.log(`SESSION_STRING=${sessionString}`);
        console.log('\n⚠️  Keep this string secret! It gives full access to your Telegram account.\n');

        await client.disconnect();
    } catch (error) {
        console.error('\n❌ Error generating session:', error);
        process.exit(1);
    }
}

generateSession();
