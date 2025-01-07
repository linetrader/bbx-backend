// src/package/initial-packages.seed.ts

import { Package } from './package.schema';
import { Model } from 'mongoose';

export async function seedInitialPackages(packageModel: Model<Package>) {
  const initialPackages = [
    {
      name: 'BTC',
      price: 1,
      miningProfit: 0.000013,
      status: 'hide',
    },
    {
      name: 'DOGE',
      price: 1,
      miningProfit: 0.0024316,
      status: 'show',
    },
    {
      name: 'BBX',
      price: 1,
      miningProfit: 0.00001, // 추가
      status: 'hide', // 필요 시 추가
    },
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
