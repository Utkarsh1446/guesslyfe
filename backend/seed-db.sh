#!/bin/bash
export DB_HOST=localhost
export DB_PORT=5433
export DB_USERNAME=guessly_user
export DB_PASSWORD=GuesslyUser2025!
export DB_DATABASE=guessly

npm run seed:run
