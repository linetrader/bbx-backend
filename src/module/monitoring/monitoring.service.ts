// src/module/monitoring/monitoring.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist';
import { Monitoring } from './monitoring.schema';
import { Model } from 'mongoose';
import { BscScanService } from '../bscscan/bscscan.service';
import { PackageUsersService } from '../package-users/package-users.service';
import { TotalMiningService } from '../total-mining/total-mining.service';
import { CoinPriceService } from '../coin-price/coin-price.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly runningProcesses = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(Monitoring.name)
    private readonly monitoringModel: Model<Monitoring>,
    private readonly bscScanService: BscScanService,
    private readonly packageUsersService: PackageUsersService,
    private readonly totalMiningService: TotalMiningService,
    private readonly coinPriceService: CoinPriceService,
  ) {}

  async onModuleInit() {
    await this.initializeMonitoringProcesses();
  }

  private async initializeMonitoringProcesses() {
    const monitoringProcesses = await this.monitoringModel.find().exec();

    for (const process of monitoringProcesses) {
      if (process.isRunning) {
        this.startMonitoringProcess(process.type);
      }
    }
  }

  async startMonitoringProcess(type: string) {
    const process = await this.monitoringModel.findOne({ type }).exec();

    if (!process) {
      this.logger.warn(`No process found for type: ${type}`);
      return;
    }

    if (this.runningProcesses.has(type)) {
      this.logger.warn(`Process ${type} is already running.`);
      return;
    }

    if (!process.isRunning) {
      this.logger.warn(`Process ${type} is marked as not running in DB.`);
      return;
    }

    if (process.type === 'mining') {
      await this.packageUsersService.initialMiningForAllPackages();
    }

    const intervalMs = process.interval * 1000;
    const intervalId = setInterval(async () => {
      try {
        this.logger.log(`Running process: ${type}`);
        await this.executeMonitoringTask(type);
      } catch (error) {
        this.logger.error(`Error while executing process ${type}:`, error);
      }
    }, intervalMs);

    this.runningProcesses.set(type, intervalId);
    this.logger.log(
      `Started process ${type} with interval ${process.interval}s.`,
    );
  }

  async stopMonitoringProcess(type: string) {
    const process = await this.monitoringModel.findOne({ type }).exec();

    if (!process) {
      this.logger.warn(`No process found for type: ${type}`);
      return;
    }

    const intervalId = this.runningProcesses.get(type);
    if (intervalId) {
      clearInterval(intervalId);
      this.runningProcesses.delete(type);
      this.logger.log(`Stopped process ${type}.`);
    } else {
      this.logger.warn(`Process ${type} is not running.`);
    }
  }

  private async executeMonitoringTask(type: string) {
    switch (type) {
      case 'deposit':
        this.logger.log('Executing deposit monitoring task...');
        await this.bscScanService.monitoringDeposits();
        break;

      case 'mining':
        this.logger.log('Executing mining monitoring task...');
        const process = await this.monitoringModel.findOne({ type }).exec();
        if (process) {
          await this.packageUsersService.startMiningForPackage(
            process.interval,
          );
        }
        break;

      case 'crawler':
        this.logger.log('Executing crawler monitoring task...');
        await this.totalMiningService.handleCron();
        break;

      case 'coinPrice':
        this.logger.log('Executing coinPrice monitoring task...');
        await this.coinPriceService.saveAllCoinPrices();
        break;

      case 'masterWithdaw':
        this.logger.log('Executing masterWithdraw monitoring task...');
        break;

      default:
        this.logger.warn(`Unknown process type: ${type}`);
    }
  }

  async updateProcessStateFromDb(type: string) {
    const process = await this.monitoringModel.findOne({ type }).exec();

    if (!process) {
      this.logger.warn(`No process found for type: ${type}`);
      return;
    }

    if (process.isRunning) {
      this.startMonitoringProcess(type);
    } else {
      this.stopMonitoringProcess(type);
    }
  }
}
