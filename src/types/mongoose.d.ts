import { Schema, Model, Document } from 'mongoose';

export type DiscriminatorModel<T extends Document> = Model<T> & {
  discriminator<U extends Document>(name: string, schema: Schema<U>): Model<U>;
};