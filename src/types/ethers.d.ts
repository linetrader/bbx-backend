declare module 'ethers' {
  export const ethers: {
    utils: {
      id: (text: string) => string;
      hexZeroPad: (value: string, length: number) => string;
    };
    Wallet: {
      createRandom: () => { address: string; privateKey: string };
    };
    // 필요한 다른 속성들 추가
  };
}
