// src/package/initial-packages.seed.ts

import { Package } from './package.schema';
import { Model } from 'mongoose';

export async function seedInitialPackages(packageModel: Model<Package>) {
  const initialPackages = [
    { name: 'BTC Mining Rig', price: 430 },
    { name: 'DOGE Mining Rig', price: 430 },
    { name: 'BBX Coin', price: 1 },
  ];

  for (const pkg of initialPackages) {
    try {
      const exists = await packageModel.findOne({ name: pkg.name }).exec();
      if (!exists) {
        const newPackage = new packageModel(pkg);
        await newPackage.save();
      }
    } catch (error) {
      console.error(`Error seeding package: ${pkg.name}`, error);
    }
  }
}
