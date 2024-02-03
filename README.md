# Verse Burn Engine Twitter Bot

## Overview
The Verse Burn Engine Twitter Bot is a Node.js application designed to monitor and report Verse token deposit and burn events on the Ethereum blockchain. It tweets updates about these events and responds to specific commands on Twitter.

## Features
- Monitors deposits to the Verse Burn Engine.
- Tracks burn events of Verse tokens.
- Posts updates on Twitter with details of these events.
- Responds to specific Twitter mentions with the total burned events.

## Requirements
- Node.js
- Web3.js
- Twitter API credentials

## Setup
1. Install dependencies: `npm install`
2. Set up environment variables in a `.env` file:
   - `INFURA_URL`: Infura endpoint for Ethereum blockchain access.
   - `TWITTER_API_KEY`, `TWITTER_API_SECRET_KEY`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`: Twitter API credentials.
3. Provide the Verse Token ABI JSON file in the project directory.

## Usage
Run the bot using `node bot.js`. It will start monitoring blockchain events and interacting on Twitter.

## Commands
Tweet at `@burnengine_bot` to trigger a response with the total burned events.

## Disclaimer
This bot is provided as-is for informational purposes. Always verify the code and customize as needed for your specific use-case.
