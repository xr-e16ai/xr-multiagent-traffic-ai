import { google } from 'googleapis';

/**
 * Sends login details to the registered email address via official Gmail API.
 * Uses OAuth 2.0 with automatic token refresh - no SMTP, no App Passwords.
 *
 * @param {string} toEmail - Recipient registered email address
 * @param {string} fullName - User's full name
 * @param {string} mobileNumber - User's registered mobile number
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendLoginDetailsEmail(toEmail, fullName, mobileNumber) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const senderEmail = process.env.GMAIL_SENDER_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    console.error('[Gmail API] Missing required OAuth environment variables.');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const emailSubject = 'E16 AI Traffic Simulation - Login Details';
    const emailBody = [
      `Dear ${fullName},`,
      '',
      'You requested your login information for the E16 AI Multi-Agent Traffic Simulation Platform.',
      '',
      'Your registered account details are:',
      '',
      `Full Name: ${fullName}`,
      `Handphone Number: ${mobileNumber}`,
      `Registered Email: ${toEmail}`,
      '',
      'Please use your registered details to access the platform.',
      '',
      'If you did not request this information, please contact E16 AI XR Technology Pvt Ltd.',
      '',
      'Regards,',
      '',
      'E16 AI XR Technology Pvt Ltd',
      'Email: xr@e16ai.com',
      'Phone: +91 9840034916'
    ].join('\n');

    // Construct raw MIME message
    const utf8Subject = `=?utf-8?B?${Buffer.from(emailSubject).toString('base64')}?=`;
    const rawMessage = [
      `From: "E16 AI XR Technology Pvt Ltd" <${senderEmail}>`,
      `To: ${toEmail}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      `Subject: ${utf8Subject}`,
      '',
      emailBody
    ].join('\r\n');

    // Base64url encode as required by Gmail API
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[Gmail API] Sending login details email...');
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`[Gmail API] Email sent successfully. Message ID: ${result.data.id}`);
    return { success: true };
  } catch (error) {
    console.error('[Gmail API] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
}
