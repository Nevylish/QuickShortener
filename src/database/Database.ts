import * as mongoose from 'mongoose';
import {Logger} from "../utils/logger";
import {Collection} from "@discordjs/collection";
import {IShortenerDBSchema, Shortener} from "./schema";
import {Functions} from "../utils/functions";
import debug = Logger.debug;
import log = Logger.log;
import success = Logger.success;
import error = Logger.error;
import randomString = Functions.randomString;
import getRandomInt = Functions.getRandomInt;

export default class Database {

    collection: Collection<string, IShortenerDBSchema> = new Collection();
    DB_URI: string = process.env['MONGODB_URI'] as string;

    connect = async () => {
        mongoose.set('debug', (collectionName, method, query, doc) => {
            debug('Database', '(debug)', `${collectionName}.${method}`, query, doc);
        });

        log('Database', 'Connecting to MongoDB Server...');

        await mongoose.connect(this.DB_URI).then(() => {
            success('Database', 'Successfully connected to database !');
        }).catch(e => {
            error('Database', 'Oops, connection to database failed.\n', e);
            process.exit(0);
        });
    }

    load = async () => {
        this.collection.clear();
        try {
            log('Database', '(load)', 'Loading URLs...');
            const data = await Shortener.find({});
            data.map(url => {
                this.collection.set(url.id, url);
            });
            success('Database', '(load)', `Loaded ${this.collection.size} urls.`);
        } catch (e) {
            error('Database', '(load)', e);
        }
    }

    find = (id: string) => {
        debug('Database', '(find)', `${id} was searched in collection.`);
        if (this.collection.has(id)) {
            return this.collection.get(id);
        } else return;
    }

    register = async (options: IShortenerDBSchema) => {
        const id = options.id ?? randomString(getRandomInt(6, 8), '#aZ');
        const data = await Shortener.create({
            fullpath: options.fullpath,
            id: id,
            target: options.target,
            infos: options.infos
        })?.catch(e => {
            throw new Error('Une erreur est survenue lors de l\'enregistrement en base de données' + e);
        })
        this.collection.set(id, data);
        return data;
    }
}
