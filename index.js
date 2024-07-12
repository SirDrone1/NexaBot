const { Client, GatewayIntentBits } = require('discord.js');
const { token, clientId, clientSecret, redirectUri } = require('./config.json');
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');
const app = express();
const port = 3000;
const colors = require('colors');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

app.use(express.static(path.join(__dirname, 'Dashboard')));

app.get('/login', (req, res) => {
  const scope = 'identify guilds';
  const oauth2Url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(oauth2Url);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send('No code provided');
    return;
  }

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', querystring.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = tokenResponse.data;
    const userGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const guilds = userGuildsResponse.data;
    const managedGuilds = guilds.filter(guild => guild.permissions & (1 << 5));

    const navButtonText = managedGuilds.length > 0 ? 'Dashboard' : 'Login';
    res.redirect(`/?navButtonText=${navButtonText}`);
  } catch (error) {
    console.error('Error during OAuth2 callback:', error);
    res.send('An error occurred during authentication');
  }
});

app.get('/', (req, res) => {
  const navButtonText = req.query.navButtonText || 'Login';

  fs.readFile(path.join('index.html'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading page.');
      return;
    }

    const updatedData = data.replace('{{NAV_BUTTON_TEXT}}', navButtonText);
    res.send(updatedData);
  });
});

client.on('ready', () => {
  const loggedInMessage = `[Console]: Logged in as ${client.user.username}`.blue;
  const closing = ` | `.white;
  const problemsMessage = ` 0 Problems Found`.green;
  console.log(loggedInMessage + closing + problemsMessage);

  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`.yellow);
  });
});

client.login(token);
