import logger from '../../logger.js';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import { getVersion } from '../utils/versionUtils.js';

export default function aboutRoutes(app) {
  const API_TITLE = process.env.API_TITLE || 'Microservice API';
  const API_DESCRIPTION =
    process.env.API_DESCRIPTION ||
    'This is an OAS description of this Microservice REST API';
  const version = getVersion();

  // Swagger options
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: API_TITLE,
        version: version,
        description: API_DESCRIPTION,
      },
      servers: [
        {
          url: 'http://localhost:3000',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./src/routes/*.js'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  const yamlSpec = yaml.dump(swaggerSpec);

  const specDir = path.join(path.resolve(), 'spec');
  if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(path.join(specDir, 'oas.yaml'), yamlSpec);

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * @swagger
   * /api/v1/about:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: Retrieve the entire README file as HTML.
   *     description: Reads the entire README file and returns its content as HTML.
   *     responses:
   *       200:
   *         description: Successfully retrieved the README file content as HTML.
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *               description: The HTML content of the README file.
   *       500:
   *         description: Error reading the README file.
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               description: Error message when the file cannot be read.
   *               example: "Error reading the file: [error details]"
   */
  app.get('/api/v1/about', async (req, res) => {
    try {
      const readmePath = path.join(path.resolve(), 'README.md');
      const data = await fs.promises.readFile(readmePath, 'utf8');
      const htmlContent = marked.parse(data);
      res.send(htmlContent);
    } catch (err) {
      logger.error('Error reading README file: ' + err);
      res.status(500).send('Error reading the file: ' + err.message);
    }
  });

  /**
   * @swagger
   * /api/v1/version:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: Retrieve the API version from the .version file.
   *     description: Reads the .version file and returns its content as part of a JSON message.
   *     responses:
   *       200:
   *         description: Successfully retrieved the API version.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: The current API version.
   *                   example: "v1.0.0"
   *       500:
   *         description: Error reading the .version file.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message summary.
   *                   example: "There was an error retrieving API version"
   *                 error:
   *                   type: string
   *                   description: Detailed error message.
   *                   example: "ENOENT: no such file or directory, open '.version'"
   */
  app.get('/api/v1/version', async (req, res) => {
    try {
      const versionPath = path.join(path.resolve(), '.version');
      const data = await fs.promises.readFile(versionPath, 'utf8');
      res.status(200).json({ message: data.trim() });
    } catch (err) {
      logger.error('Error reading .version file: ' + err);
      res.status(500).json({
        message: 'There was an error retrieving API version',
        error: err.message,
      });
    }
  });

  /**
   * @swagger
   * /api/v1/changelog:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: Retrieve the API changelog.
   *     description: >
   *       Reads the `CHANGELOG.md` file, parses its content, and returns it as HTML.
   *       Supports filtering by specific versions, multiple versions, or a version range.
   *     parameters:
   *       - in: query
   *         name: versions
   *         schema:
   *           type: string
   *         description: >
   *           Comma-separated list of release versions to retrieve (e.g. `v2.1.4,v2.1.2`).
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *         description: >
   *           Starting release version for the changelog range (inclusive, e.g. `v2.1.2`).
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *         description: >
   *           Ending release version for the changelog range (inclusive, e.g. `v2.1.4`).
   *     responses:
   *       200:
   *         description: Successfully retrieved the changelog.
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *               description: The HTML representation of the changelog or filtered releases.
   *       500:
   *         description: Error reading the CHANGELOG.md file.
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               description: Error message when the changelog cannot be read.
   *               example: "There was an error retrieving API release notes: ENOENT: no such file or directory, open 'CHANGELOG.md'"
   */
  app.get('/api/v1/changelog', async (req, res) => {
    try {
      const changelogPath = path.join(path.resolve(), 'CHANGELOG.md');
      const data = await fs.promises.readFile(changelogPath, 'utf8');

      const { versions, from, to } = req.query;
      let filteredContent = '';

      const releases = data
        .split(/^# Release /m)
        .filter((r) => r.trim())
        .map((r) => '# Release ' + r);

      if (versions) {
        const versionList = versions.split(',').map((v) => v.trim());
        filteredContent = releases
          .filter((r) => versionList.some((v) => r.includes(`# Release ${v}`)))
          .join('\n');
      } else if (from || to) {
        const getVersionNumber = (releaseStr) => {
          const match = releaseStr.match(/^# Release v(\d+\.\d+\.\d+)/m);
          return match ? match[1] : '';
        };
        const fromVer = from ? from.replace(/^v/, '') : null;
        const toVer = to ? to.replace(/^v/, '') : null;

        const inRange = (ver) => {
          const compare = (a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          if (fromVer && compare(ver, fromVer) < 0) return false;
          if (toVer && compare(ver, toVer) > 0) return false;
          return true;
        };

        filteredContent = releases
          .filter((r) => {
            const ver = getVersionNumber(r);
            return ver && inRange(ver);
          })
          .join('\n');
      } else {
        filteredContent = data;
      }

      const htmlContent = marked.parse(filteredContent);
      res.send(htmlContent);
    } catch (err) {
      logger.error('Error reading CHANGELOG.md file: ' + err);
      res
        .status(500)
        .send('Error retrieving API release notes: ' + err.message);
    }
  });
}
