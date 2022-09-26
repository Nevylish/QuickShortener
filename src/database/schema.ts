import {Model, model, Schema} from 'mongoose';

export interface IShortenerDBSchema {
    fullpath: string;
    id: string;
    target: string;
    infos: {
        rawHeaders: Array<string>,
        ipAdress: string
    }
    createdAt?: Date;
}

const shortener = new Schema({
    fullpath: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    target: {
        type: String,
        required: true
    },
    infos: {
        rawHeaders: [String],
        ipAdress: String
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

// @ts-ignore
export const Shortener: Model<IShortenerDBSchema> = model('shortener', shortener);
