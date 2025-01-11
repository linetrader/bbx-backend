// src/module/monitoring/monitoring.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { seedInitialMonitoring } from './monitoring.initial';
import { InjectModel } from '@nestjs/mongoose/dist';
import { Monitoring } from './monitoring.schema';
import { Model } from 'mongoose';
import { BscScanService } from './bscscan/bscscan.service';
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
    private readonly bscScanService: BscScanService, // BscScanService 주입
    private readonly packageUsersService: PackageUsersService,
    private readonly totalMiningService: TotalMiningService,
    private readonly coinPriceService: CoinPriceService,
  ) {}

  /**
   * 모듈 초기화 시 호출
   */
  async onModuleInit() {
    await seedInitialMonitoring(this.monitoringModel);
    await this.initializeMonitoringProcesses();
  }

  /**
   * 모든 모니터링 프로세스를 초기화
   */
  private async initializeMonitoringProcesses() {
    const monitoringProcesses = await this.monitoringModel.find().exec();

    for (const process of monitoringProcesses) {
      if (process.isRunning) {
        this.startMonitoringProcess(process.type);
      }
    }
  }

  /**
   * 특정 모니터링 프로세스를 시작
   */
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
      // 마이닝 패키지 초기화.
      await this.packageUsersService.initialMiningForAllPackages();
    }

    const intervalMs = process.interval * 1000; // 초 단위 -> 밀리초
    const intervalId = setInterval(async () => {
      try {
        this.logger.log(`Running process: ${type}`);
        // 여기에 각 프로세스별 동작을 추가
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

  /**
   * 특정 모니터링 프로세스를 중지
   */
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

  /**
   * 특정 작업 실행 (여기서 비즈니스 로직 추가)
   */
  private async executeMonitoringTask(type: string) {
    switch (type) {
      case 'deposit':
        // 입금 관련 작업 로직
        this.logger.log('Executing deposit monitoring task...');
        await this.bscScanService.monitoringDeposits();
        break;

      case 'mining':
        // 마이닝 관련 작업 로직
        this.logger.log('Executing mining monitoring task...');
        await this.packageUsersService.startMiningForPackage();
        //console.log('Executing mining monitoring task...');
        break;

      case 'crawler':
        // 채굴 사이트 크롤링 관련 작업 로직
        this.logger.log('Executing crawler monitoring task...');
        await this.totalMiningService.handleCron();
        //console.log('Executing masterWithdraw monitoring task...');
        break;

      case 'coinPrice':
        // 코인 가격 저장 관련 작업 로직
        this.logger.log('Executing coinPrice monitoring task...');
        await this.coinPriceService.saveAllCoinPrices();
        //console.log('Executing masterWithdraw monitoring task...');
        break;

      case 'masterWithdaw':
        // 마스터 출금 관련 작업 로직
        this.logger.log('Executing masterWithdraw monitoring task...');
        //console.log('Executing masterWithdraw monitoring task...');
        break;

      default:
        this.logger.warn(`Unknown process type: ${type}`);
    }
  }

  /**
   * DB에 따라 특정 프로세스 상태 업데이트 및 반영
   */
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
