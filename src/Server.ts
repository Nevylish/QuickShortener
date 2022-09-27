import express, {Express} from 'express';
import Database from './database/Database';
import {Functions} from './utils/functions';
import {IShortenerDBSchema} from './database/schema';
import {Constants} from "./utils/constants";
import {Logger} from "./utils/logger";
import randomString = Functions.randomString;
import getRandomInt = Functions.getRandomInt;
import isValidURL = Functions.isValidURL;
import blacklistedWords = Constants.blacklistedWords;
import log = Logger.log;
import success = Logger.success;
import conflitsWords = Constants.conflitsWords;

export default class Server {
    readonly config = require('../config.json');
    readonly port: number = this.config.port;
    readonly #app: Express = express();
    readonly #database: Database;
    readonly #token: string | undefined = process.env['token'];

    constructor() {
        if (this.config.authentificationRequired && !this.#token) {
            throw new Error('Token needed on env if auth required.');
        }

        this.#database = new Database();
        this.#database.connect().then(async () => {
            await this.#database.load();
            this.start();
        });
    }

    api = () => {
        this.#app.get('/api/register', (req, res) => {
            let id = req.query.id?.toString();
            const url = req.query.url?.toString();
            const secret = req.query.secret?.toString();
            const rawHeaders = req.rawHeaders;
            // TODO: récuperer l'adresse ip de l'utilisateur
            const ip = req.ip.toString();

            if (this.config.authentificationRequired) {
                if (!secret) {
                    res.status(401).send({error: 'Authentification failed. Need "secret" parameter.'});
                    return;
                } else if (secret !== this.#token) {
                    res.status(401).send({error: 'Invalid authentification token.'});
                    return;
                }
            }

            if (id) {
                if (blacklistedWords.includes(id)) {
                    res.status(403).send({error: 'ID contains blacklisted words, retry with another ID.'});
                    return;
                }

                for (const word of conflitsWords) {
                    if (id === word) {
                        res.status(403).send({error: 'ID contains confits words, retry with another ID.'});
                        return;
                    }
                }

                if (this.#database.find(id)) {
                    res.status(401).send({error: 'ID already exists, retry with another ID.'});
                    return;
                }
            }

            if (!url) {
                res.status(400).send({error: 'Missing url parameter like: ' + this.config.domain + '/api/register?url=https://example.org/'});
                return;
            }

            if (!isValidURL(url)) {
                res.send({error: 'Error: Invalid URL.'});
                return;
            }

            id = id ?? randomString(getRandomInt(6, 8), '#aA');

            const data: IShortenerDBSchema = {
                fullpath: this.config.domain + id,
                id: id,
                target: url,
                infos: {
                    rawHeaders: rawHeaders,
                    ipAdress: ip
                }
            }

            this.#database.register(data).then(data => {
                res.status(200).send(data);
            })?.catch(() => {
                res.send({error: 'Error'});
            });
        });
    }

    start = () => {
        log('Server', '(start)', 'Starting Express server...');

        this.api();

        this.#app.get('/', (req, res) => {
            res.status(200).send('Hello World!');
        });

        this.#app.get('/:id', async (req, res) => {
            const id = req.params.id;

            if (blacklistedWords.includes(id)) {
                res.status(403).send({error: 'ID contains blacklisted words.'});
                return;
            }

            const data = this.#database.find(id);

            if (data) {
                res.status(200).redirect(data.target);
            } else {
                res.status(404).send('Nothing here...');
            }
        });

        this.#app.listen(this.port, () => {
            success('Server', '(start)', `Express server started, listening on port ${this.port}`);
        });
    }
}
