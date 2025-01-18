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
import { UsersService } from '../users/users.service';
import { GetPendingContractsResponse } from './dto/get-pending-contracts-response.dto';

@Injectable()
export class ContractsService implements OnModuleInit {
  constructor(
    @InjectModel(DefaultContract.name)
    private readonly defaultContractModel: Model<DefaultContract>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<Contract>,
    private readonly usersService: UsersService, // 유저 서비스 추가
  ) {}

  // 모듈 초기화 시 호출
  async onModuleInit() {
    //await this.initializeDefaultContract();
    //await this.updateMissingStatusFields();
  }

  async confirmContract(contractId: string): Promise<boolean> {
    // 2. 계약서 가져오기.
    const contractUser = await this.contractModel.findById(contractId).exec();
    if (!contractUser) {
      //throw new BadRequestException('계약서가 없습니다.');
      return false;
    }

    // 3. 계약 상태 승인으로 바꾸고 저장.
    contractUser.status = 'approved';
    contractUser.save();

    // 4. 유저의 밸런스 업데이트.

    return true;
  }

  async getDefaultContract(): Promise<DefaultContract> {
    const defaultContract = await this.defaultContractModel.findOne().exec();
    if (!defaultContract) {
      throw new NotFoundException('Default contract information not found');
    }
    //console.log(defaultContract);
    return defaultContract;
  }

  async getPendingContractsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<GetPendingContractsResponse[]> {
    const requestingUser = await this.usersService.isValidAdmin(user.id);

    if (!requestingUser) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    const contracts = await this.contractModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 }) // 최신순 정렬
      .skip(offset)
      .limit(limit)
      .exec();

    return Promise.all(
      contracts.map(async (contract) => {
        const username = await this.usersService.getUserName(contract.userId);

        return {
          id: contract.id,
          username: username || 'Unknown',
          packageName: contract.packageName,
          quantity: contract.quantity,
          totalPrice: contract.totalPrice,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        };
      }),
    );
  }

  async getTotalPendingContracts(): Promise<number> {
    return this.contractModel.countDocuments({ status: 'pending' }).exec();
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
  async getPackageRecordsByUser(
    user: { id: string },
    status: string,
  ): Promise<Contract[]> {
    try {
      if (!user || !user.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      const userId = user.id;

      const packages = await this.contractModel
        .find({ userId, status }) // userId와 status로 필터링
        .sort({ createdAt: -1 }) // 최신순 정렬
        .exec();

      if (!packages || packages.length === 0) {
        console.log(`No packages found for status: ${status}`);
        throw new BadRequestException('Packages not found.');
      }

      return packages;
    } catch (error) {
      const err = error as Error;
      throw new BadRequestException(err.message);
    }
  }

  private async updateMissingStatusFields(): Promise<void> {
    try {
      const packagesWithoutStatus = await this.contractModel
        .find({ status: { $exists: false } }) // status 필드가 없는 데이터 검색
        .exec();

      if (packagesWithoutStatus.length > 0) {
        console.log(
          `Found ${packagesWithoutStatus.length} packages without status. Updating to 'approved'.`,
        );

        for (const pkg of packagesWithoutStatus) {
          pkg.status = 'approved'; // 기본값 설정
          await pkg.save();
        }

        console.log('All missing status fields have been updated.');
      }
    } catch (error) {
      console.error('Error updating missing status fields:', error);
    }
  }

  async initializeDefaultContract(): Promise<DefaultContract> {
    const exists = await this.defaultContractModel.findOne().exec();
    if (!exists) {
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
