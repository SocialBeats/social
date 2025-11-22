# Microservice Template

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow)](https://www.conventionalcommits.org/)

A basic Node.js microservice template designed to help you quickly bootstrap microservices with Docker, testing, and logging support. Please edit this file once you are developing your microservice and document it properly.

## Project Structure

```fs
.
├── src/                          # Application source code
├── tests/                        # Unit and integration tests
├── spec/                         # Test specifications or additional test resources
├── .github/                      # GitHub workflows and configurations
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Docker Compose setup
├── package.json                  # Node.js dependencies and scripts
├── .env.example                  # Example environment variables
├── .env.docker.example           # Env template for hybrid (app in Docker, DB on host)
├── .env.docker-compose.example   # Env template for full-docker
└── logger.js                     # App Logger
```

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm
- Docker (optional)
- Docker Compose (optional)

## Installation and Running

1. Clone the repository:

   ```bash
   git clone https://github.com/SocialBeats/microservice-template.git
   cd microservice-template
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Choose your development environment and run:

   ### Local Development

   ```bash
   npm run dev:local
   ```

   **What it does:**
   - Copies `.env.example` to `.env`
   - Starts the application locally using `npm start`
   - The app runs on your machine and connects to MongoDB on `localhost:27017`

   **What you need:**
   - MongoDB installed and running locally on port 27017
   - The `.env` file will be configured with:
     ```
     MONGOURL=mongodb://localhost:27017/microservice-template
     MONGOTESTURL=mongodb://localhost:27017/microservice-template_test
     ```
   - Edit other variables in `.env` as needed (JWT_SECRET, LOG_LEVEL, etc.)

   ### Hybrid Development (App in Docker, Database on Host)

   ```bash
   npm run dev:docker
   ```

   **What it does:**
   - Copies `.env.docker.example` to `.env`
   - Builds a Docker image of your application
   - Runs the application inside a Docker container
   - The containerized app connects to MongoDB running on your host machine

   **What you need:**
   - MongoDB installed and running locally on port 27017
   - **MongoDB MUST be configured to accept connections from Docker containers**
   - The `.env` file will be configured with:
     ```
     MONGOURL=mongodb://host.docker.internal:27017/microservice-template
     MONGOTESTURL=mongodb://host.docker.internal:27017/microservice-template_test
     ```

   **⚠️ IMPORTANT: MongoDB Configuration for Docker Access**

   By default, MongoDB only listens on `localhost` (127.0.0.1), which means Docker containers cannot connect to it. You need to configure MongoDB to accept connections from all interfaces.

   **For Linux:**
   1. Edit the MongoDB configuration file:
      ```bash
      sudo nano /etc/mongod.conf
      ```
   2. Find the `net` section and modify `bindIp`:
      ```yaml
      net:
        port: 27017
        bindIp: 0.0.0.0
      ```
   3. Save the file and restart MongoDB:
      ```bash
      sudo systemctl restart mongod
      ```
   4. Verify MongoDB is listening on all interfaces:
      ```bash
      sudo netstat -tuln | grep 27017
      ```
      You should see `0.0.0.0:27017` in the output.

   **For Windows:**
   1. Locate and edit the MongoDB configuration file:
      ```
      C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg
      ```
      (Replace `<version>` with your MongoDB version, e.g., `7.0`)
   2. Find the `net` section and modify `bindIp`:
      ```yaml
      net:
        port: 27017
        bindIp: 0.0.0.0
      ```
   3. Save the file and restart the MongoDB service:
      - Open **Services** (press `Win + R`, type `services.msc`, and press Enter)
      - Find **MongoDB Server** in the list
      - Right-click and select **Restart**
   4. Alternatively, restart via Command Prompt (as Administrator):
      ```cmd
      net stop MongoDB
      net start MongoDB
      ```
   5. Verify MongoDB is listening on all interfaces:
      ```cmd
      netstat -an | findstr :27017
      ```
      You should see `0.0.0.0:27017` in the output.

   ### Full Docker Compose Development

   ```bash
   npm run dev:compose
   ```

   **What it does:**
   - Copies `.env.docker-compose.example` to `.env`
   - Starts all services defined in `docker-compose.yml` using `docker-compose up --build`
   - Runs both the application and MongoDB in isolated Docker containers
   - This is the recommended approach for a consistent, production-like environment

   **What you need:**
   - Docker and Docker Compose installed
   - No local MongoDB installation required
   - The `.env` file will be configured with:
     ```
     MONGOURL=mongodb://mongodb:27017/microservice-template
     MONGOTESTURL=mongodb://mongodb:27017/microservice-template_test
     ```
   - The `mongodb` hostname refers to the MongoDB container defined in `docker-compose.yml`

   ***

   **General Notes:**
   - By default, your microservice will run on **port 3000**
   - Use **API_TITLE** and **API_DESCRIPTION** environment variables to customize the Swagger UI
   - The **JWT_SECRET** should be changed in production environments
   - Adjust **LOG_LEVEL** (error, warn, info, verbose, debug, silly) based on your needs

## Running Tests

```bash
npm test
```

Tests are located in the `tests/` folder and can include both unit and integration tests. You can see
A report will be created in **_/coverage_** folder. Check the console and the index.html to see the results.
test coverage by running this command.

```bash
npm run test:coverage
```

## Logging

This template includes a `logger.js` utility for consistent structured logging across the application. Logs levels are the following: error > warn > info > verbose > debug > silly

To use the logger do this:

```javascript
import logger from 'PATH/TO/logger.js';

logger.error('Sample text');
logger.warn('Sample text');
logger.info('Sample text');
logger.debug('Sample text');
logger.verbose('Sample text');
logger.silly('Sample text');
```

## Documentation and versioning

Please **_DO NOT_** touch `.version` and `CHANGELOG.md`, and do not forget to use **_jsdocs_** in order to document and add are your routes to Swagger UI. See this example and check the ones in **_src\routes\aboutRoutes.js_** for further information. You can also check the [official jsdoc documentation](https://jsdoc.app/)

```javascript
/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns basic information to verify that the API is running properly.
 *     responses:
 *       200:
 *         description: API is healthy and responding.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Health check successful
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-11-08T13:41:47.074Z"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Health check successful',
    version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});
```

## API Developement

In order to keep track of API features bear in mind to add **_/api/vX/_** prefix to all your endpoints where X is the version of each one. In case you are changing an existing one, then use **_/api/vX+1/_**. **By default the prefix is /api/v1/**.

By default, all new endpoints require authentication via JWT. However, you can add new open endpoints like this:
Go to **_./src/middlewares/authMiddlewares.js_** and add your new open routes here:

```javascript
const openPaths = [
  '/api/v1/docs/',
  '/api/v1/health',
  '/api/v1/about',
  '/api/v1/changelog',
  '/api/v1/version',
];
```

## Linting

You will have a better experience developing using **_.vscode_** features provided in this template. To do so, you must first install the following extensions in your vs-code:

- Prettier - Code formatter
- ESLint

Once you have them, the code will lint some stuff once you save a file. Do not worry because in case you do not want it to do so, just go to **_.vscode\settings.json_** and deactivate this feature with **_"editor.formatOnSave": false_**.

If you want to scan all your project you can use this command:

```bash
npm run lint
```

There is a command to fix lint problems. To do so, just run this:

```bash
npm run lint:fix
```

By default, your vs-code will autolint your stayed files once you decide that you want to commit. Anyways there is a workflow for linting external code, and you can fix lint format with those two commands. This environment is meant to be comfortable so you do not have to worry about anything related with lint. However, everything can be disabled (do it at your own risks, as its not recommended).

## Conventional Commits

This project follows the **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** specification, which provides a standard way to structure commit messages.

There are hooks to avoid committing weird stuff.

## Commit Convention

To maintain a clean and consistent git history, all commits must follow this convention:

```git
<type>: <short description>
```

### Allowed Types

- **feat** → new feature
- **fix** → bug fix
- **docs / doc** → documentation
- **style** → formatting, no code logic changes
- **refactor** → code refactoring
- **perf** → performance improvement
- **test / tests** → adding or updating tests
- **build** → changes in build system or dependencies
- **ci** → continuous integration
- **chore** → maintenance tasks
- **sec** → security improvements

### Examples of Valid Commits

```text
feat: add login endpoint
fix: correct user password validation
docs: update README with new instructions
style: format code with prettier
refactor: optimize database queries
perf: improve response time
test: add unit tests for auth
ci: update GitHub Actions workflow
chore: remove deprecated package
sec: hash passwords with bcrypt
```
