// src/module/monitoring/monitoring.initial.ts

import { Monitoring } from './monitoring.schema';
import { Model } from 'mongoose';

export async function seedInitialMonitoring(
  monitoringModel: Model<Monitoring>,
) {
  const initialMonitoring = [
    {
      type: 'deposit',
      isRunning: true,
      interval: 60,
    },
    {
      type: 'mining',
      isRunning: true,
      interval: 300,
    },
    {
      type: 'crawler',
      isRunning: true,
      interval: 3600,
    },
    {
      type: 'coinPrice',
      isRunning: true,
      interval: 60,
    },
    {
      type: 'masterWithdaw',
      isRunning: true,
      interval: 60,
    },
  ];

  for (const pkg of initialMonitoring) {
    try {
      const exists = await monitoringModel.findOne({ type: pkg.type }).exec();
      if (!exists) {
        const newPackage = new monitoringModel(pkg);
        await newPackage.save();
      }
    } catch (error) {
      console.error(`Error seeding package: ${pkg.type}`, error);
    }
  }
}
