// contracts.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DefaultContract } from './contracts.default.schema';
import { Contract, CreateContractInput } from './contracts.schema';

@Injectable()
export class ContractsService implements OnModuleInit {
  constructor(
    @InjectModel(DefaultContract.name)
    private readonly defaultContractModel: Model<DefaultContract>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<Contract>,
  ) {}

  // 모듈 초기화 시 호출
  async onModuleInit() {
    await this.initializeDefaultContract();
  }

  async getDefaultContract(): Promise<DefaultContract> {
    const defaultContract = await this.defaultContractModel.findOne().exec();
    if (!defaultContract) {
      throw new NotFoundException('Default contract information not found');
    }
    //console.log(defaultContract);
    return defaultContract;
  }

  async createContract(input: CreateContractInput): Promise<boolean> {
    try {
      const defaultContract = await this.getDefaultContract();
      const currentDate = new Date().toISOString().split('T')[0];

      const newContract = new this.contractModel({
        ...input,
        content: defaultContract.content,
        date: currentDate,
        companyName: defaultContract.companyName,
        companyAddress: defaultContract.companyAddress,
        businessNumber: defaultContract.businessNumber,
        representative: defaultContract.representative,
      });

      //console.log(newContract);

      await newContract.save();
      return true;
    } catch (error) {
      console.error('Error creating contract:', error);
      return false;
    }
  }

  // 특정 사용자 구매 기록 조회
  async getPackageRecordsByUser(user: { id: string }): Promise<Contract[]> {
    try {
      if (!user || !user.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      //console.log('getPackageRecordsByUser - user.id : ', user.id);

      const userId = user.id;
      const packages = await this.contractModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .exec();

      if (!packages) {
        console.log('Packages not found.');
        throw new BadRequestException('Packages not found.');
      }

      //console.log('getPackageRecordsByUser - packages : ', packages);

      return packages;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  async initializeDefaultContract(): Promise<DefaultContract> {
    const exists = await this.defaultContractModel.findOne().exec();
    if (!exists) {
      const defaultContract = new this.defaultContractModel({
        content: `
MINING EQUIPMENT MANAGEMENT AGREEMENT
  
This agreement is made and entered into between Yoon Jeong-hoon, the CEO of Niacorporation (hereinafter referred to as "Party A"), and _____________ (hereinafter referred to as "Party B") as follows:
  
Article 1: Purpose  
The purpose of this agreement is for Party A to mine Dogecoin for Party B using the cloud server of the agreed-upon capacity of the mining computer owned by Party A, for the duration of the contract, and to establish the rights and obligations concerning the payment of the management fee.
  
Article 2: Commissioned Management  
1) Party A shall maintain the performance of the mining computer with the defined capacity of graphics cards at their best working condition during the contract period, and shall diligently manage the mining to maximize the Dogecoin mined.
2) Party A shall take measures to prevent hacking attempts from external third parties.
  
Article 3: Commissioned Management Fee  
1) The commissioned management fee is 430 USDT, which shall be paid upfront to Party A upon contract signing, and Party A shall provide Party B with (15TH) in return.
2) The Dogecoin mined using the hash purchased by Party B shall be divided with 85% going to Party B and 15% to Party A.
3) The management period shall be 3 years, after which the ownership of the mining cloud server commissioned by Party B shall belong to Party A.
  
Article 4: Management Report  
1) Party A shall deposit the mined Dogecoin into Party B’s electronic wallet, and Party A shall bear no responsibility for any fluctuations in the value of the coins once they are deposited in the wallet.
2) Party B acknowledges that the amount of Dogecoin mined under Party A’s commissioned management may vary, and from the day the coins are deposited into the wallet, Party B shall not raise any objections regarding the quantity or any other matters related to the deposit. This clause is to ensure that Party A is not held responsible for any issues arising from Party B's personal wallet management, even if the coins were delivered correctly.
3) The mining amount of the coins may vary depending on the Dogecoin mining environment.
  
Article 5: Prohibition of Transfer  
Neither Party A nor Party B may transfer or provide collateral for the rights under this agreement to any third party. Any transfer or provision of collateral in violation of this clause shall not entitle either party to claim any rights from the other.
  
Article 6: Termination of the Contract  
1) Party B cannot terminate the contract simply due to a change of mind.
2) Either Party A or Party B may terminate the contract by written notice if it becomes impossible to achieve the purpose of the contract due to the fault of the other party. In such cases, the legal relationships arising from the commissioned management already carried out shall not be affected, and the contractual relationship will terminate going forward.
  
Article 7: Refund Policy  
If there is an issue in the mining environment during the commissioned management period that results in 0% profitability and mining does not proceed, a refund will be provided. However, the value of the coins already mined and distributed will be deducted from the refund, and the coin price will be based on the price at the time of subscription.
  
Article 8: Jurisdiction  
In the event of any disputes related to this contract, the competent court shall be the court located at Party A’s address.
`,
        companyName: 'NiA Corporation Co., Ltd.',
        companyAddress:
          '18, Teheran-ro 20-gil, Gangnam-gu, Seoul, Republic of Korea',
        businessNumber: '765-87-02260',
        representative: 'YunJungHoon',
      });
      return defaultContract.save();
    }
    return exists;
  }
}
