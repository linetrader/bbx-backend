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

      // 유저랑 회사의 계약 컨펌 DB 에 저장
      const newContract = new this.contractModel({
        ...input,
        content: defaultContract.content, // 계약내용 저장
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
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  async initializeDefaultContract(): Promise<DefaultContract> {
    const exists = await this.defaultContractModel.findOne().exec();
    if (!exists) {
      //     const defaultContract = new this.defaultContractModel({
      //       content: [
      //         `
      // Mining Management Agreement

      // This Mining Management Agreement is entered into by and between NIA Corporation (hereinafter referred to as "Party A"), represented by its CEO, Yoon Jung-Hoon, and ___________ (hereinafter referred to as "Party B") under the following terms and conditions regarding the entrusted management of Dogecoin mining machines.
      //         `,
      //         `
      // Article 1. Purpose
      // This Agreement aims to define the rights and obligations concerning Party A’s provision of cloud server capacity for Party B using mining computers owned by Party A to mine Dogecoin during the contract period, in return for payment of management fees by Party B.
      //         `,
      //         `
      // Article 2. Entrusted Responsibilities
      // 1) Party A shall maintain the performance of the mining computers to ensure that the designated graphics cards operate in their optimal condition throughout the contract period, exercising due care as a prudent manager to maximize Dogecoin mining.
      // 2) Party A shall make efforts to prevent hacking attempts by third parties.
      //         `,
      //         `
      // Article 3. Management Fees
      // 1) The management fee shall be 430 USDT (Tether), which Party B shall pay in advance to Party A upon signing the Agreement. In return, Party A shall provide Party B with 15TH (hash rate).
      // 2) Dogecoins mined through the hash rate purchased by Party B shall be distributed as follows: 85% to Party B and 15% to Party A.
      // 3) The management period shall be three (3) years, and upon the expiration of the 3-year term, ownership of the cloud server entrusted for mining by Party B shall be transferred to Party A.
      //         `,
      //         `
      // Article 4. Management Reports
      // 1) Party A shall deposit the mined Dogecoins into Party B's designated digital wallet. Party A shall not bear any responsibility for fluctuations in the value of the coins deposited into the wallet.
      // 2) Party B acknowledges that the quantity of mined coins managed by Party A may vary and agrees not to raise any objections to Party A regarding the number of coins deposited on the date of transfer. This includes absolving Party A of any responsibility for losses caused by Party B's wallet management after proper coin transfer.
      // 3) The volume of mined Dogecoins may vary depending on the Dogecoin mining environment.
      // 4) By signing below, both parties acknowledge and agree to the terms and conditions stated in this Agreement.
      //         `,
      //         `
      // Article 5. Prohibition of Assignment
      // Neither Party A nor Party B may assign or offer as collateral any rights under this Agreement to a third party. Any attempt to assign or provide collateral in violation of this provision shall not be enforceable against the other party.
      //         `,
      //         `
      // Article 6. Termination of the Agreement
      // 1) Party B cannot terminate this Agreement due to a mere change of mind.
      // 2) Either Party A or Party B may terminate this Agreement in writing if it becomes impossible to achieve the purpose of the Agreement due to a breach of contract by the other party. In such a case, the legal relationships concerning the management already performed remain unaffected, and the contractual relationship shall cease to exist for the future.
      //         `,
      //         `
      // Article 7. Force Majeure
      // If the performance of this Agreement becomes impossible or the purpose of the Agreement cannot be achieved due to force majeure (e.g., natural disasters), either party may notify the other party in writing and terminate the Agreement. In such cases, the parties shall be mutually exempt from liability for damages. However, obligations incurred prior to the impossibility of performance shall remain valid.
      //         `,
      //         `
      // Article 8. Jurisdiction
      // Any disputes arising in connection with this Agreement shall be resolved by the court having jurisdiction over the address of Party A.
      //         `,
      //       ],
      //       companyName: 'NiA Corporation Co., Ltd.',
      //       companyAddress:
      //         '18, Teheran-ro 20-gil, Gangnam-gu, Seoul, Republic of Korea',
      //       businessNumber: '765-87-02260',
      //       representative: 'YunJungHoon',
      //     });
      const defaultContract = new this.defaultContractModel({
        content: [
          `
도지 채굴기 위탁관리 계약서
`,
          `
주식회사 니아코퍼레이션 대표이사 윤정훈(이하 “갑이라 함)과 _____________(이하 “을”이라 함)는 아래와 같이 도지 채굴기에 대한 위탁 관리 계약을 체결한다.
`,
          `
제1조 목적
본 계약은 “갑”이 소유한 채굴용 컴퓨터에 합의된 용량의 클라우드 서버를 사용하여 ‘을’을 위해 계약기간 동안 도지코인을 채굴하고, 그 대가로 위탁운영비 지급에 것에 관한 권리의무 사항을 정하는 것을 목적으로 한다.
`,
          `
제2조 위탁사항
1)“갑”은 계약기간 동안 정해진 용량의 그래픽카드가 최고의 상태에서 작동할 수 있도록 채굴 컴퓨터의 성능을 유지하여야 하며 도지코인이 최대한 채굴될 수 있도록 선량한 관리자의 주의의무를 다하여야 한다
2)“갑”은 외부의 제3자로부터의 해킹 방지에 노력하여야 한다.
`,
          `
제3조 위탁관리료
1)위탁관리료 430 USDT(테더)이며 계약체결과 동시에 선불로 위탁관리료를 “갑”에게 지급하여야 하며 “갑”은 “을”에게 (15TH) 를 제공한다.
2)”을”이 구입한 해시를 통해 채굴되는 도지코인은 “을”이 85% “갑”이 15%로 분배한다.  
3)위탁관리 기간은 (3년)으로 하며 3년 이후에는 “을”이 위탁한 채굴 클라우드 서버의 소유권은 “갑”에게 있다.
`,
          `
제4조 관리보고
1)”갑”은 채굴된 도지코인을 “을”의 전자지갑에 입금하여야 하고 전자지갑에 입금된 코인 가격의 변동은 “갑”에게 일체의 책임이 없다.
2)”을”은 “갑”이 위탁관리 하여 채굴된 코인의 양은 변동성이 있으며 전자지갑에 코인을 입금한 날로부터 코인의 입금 수량 등 일체에 관하여 “갑”에게 어떠한 이의를 제기할 수 없다. 이는 코인이 정상적으로 전달되었더라도 “을”의 개인지갑 관리 과정에서 발생된 책임이 “갑”에게 전가 시키지 못하게 하고자 함이다.
3)코인 채굴량은 도지코인 채굴 환경에 따라 달라질 수 있다.
`,
          `
제5조 양도금지
“갑”과 “을”은 이 계약에 따른 권리를 제3자에게 양도하거나 담보를 제공할 수 없으며, 이를 위반하여 양도하거나 담보를 제공하더라도 서로에게 그 권리를 주장할 수 없다.
`,
          `
제6조 계약의 해지
1)“을의 단순 변심으로 인한 계약해지는 할 수 없다.
2)”갑” 또는 “을”은 당사자 일방의 귀책사유로 더 이상 계약의 목적을 달성할 수 없는 경우에는 문서로 계약을 해지할 수 있다. 이 경우 이미 행한 위탁관리의 법률관계에는 어떠한 영향도 미치지 아니하고, 장래에 향하여 계약관계를 소멸시킨다.
`,
          `
제 7조 천재 지변(불가항력)
본 계약은 천재지변(불가항력)으로 인해 계약의 이행이 불가능하거나, 계약 목적이 달성될 수 없다고 인정되는 경우 어느 한쪽 당사자는 상대방에게 서면으로 통지하고 계약을 해지할 수 있음. 이 경우, 당사자들은 상호 간 손해배상 책임을 면제하며, 이행 불가능 이전에 발생한 의무는 계속 유효 하다.
`,
          `
제8조 관할법원
본 계약과 관련하여 분쟁이 발생하는 경우 “갑”의 주소지의 관할법원에서 해결하기로 한다.
`,
        ],
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
