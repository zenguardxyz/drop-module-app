import Base from '../assets/icons/base.png';
import Celo from '../assets/icons/celo.jpg';
import ETH from '../assets/icons/eth.svg';
import Gnosis from '../assets/icons/gno.svg';
import Matic from '../assets/icons/matic.svg';
import USDT from '../assets/icons/usdt.svg';
import EURe from '../assets/icons/eure.svg';
import USDe from '../assets/icons/usde.svg';
import Boge from '../assets/icons/boge.jpg';


export const badgeIcons = [
    { ids: ['84532', '8453'], img: Base },
    { ids: ['11155111', '5', '1'], img: ETH },
    { ids: ['100'], img: 'https://app.safe.global/images/networks/gno.png' },
    { ids: ['42220'], img: Celo },
    { ids: ['1101', '137', '80001'], img: Matic },
    // Add more mappings as needed
  ];


export function getIconForId(id: any) {
    for (const icon of badgeIcons) {
      if (icon.ids.includes(id.toString())) {
        return icon.img;
      }
    }
      // Return a default icon or handle the case when no mapping is found
  return 'defaultIcon';
}


export const tokenList: any = {

  84532: [
    {
        value: '0x0000000000000000000000000000000000000000',
        label: 'ETH',
        image: ETH,
        description: 'Ether currency',
      },    
      
      {
        value: '0xC432004323f06ca58362A5EFd993A368c93d032b',
        label: 'OST',
        image: Base,
        description: 'Onchain Summer Token',
      },     

  ],

  8453: [
    {
        value: '0x0000000000000000000000000000000000000000',
        label: 'ETH',
        image: ETH,
        description: 'Ether currency',
      },   
      {
        value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        label: 'USDC',
        image: USDe,
        description: 'Circle USDS token',
      },     
      {
        value: '0x4e496c0256FB9D4CC7Ba2fdF931bC9CbB7731660',
        label: 'BOGE',
        image: Boge,
        description: 'BOGE token',
      },                                                                                                  

  ],


}


export  const getTokenInfo = (chainId: number, token: string) => 

{
    try{ 
    if(Object.keys(tokenList).includes(chainId.toString())) {

        return tokenList[chainId].find((item: any) => item.value.toLowerCase() == token?.toLowerCase());

    }
   }
   catch(e) {
       console.log('Error getting token info')
   }
    
    return {};
}

export  const getTokenList = (chainId: number) => 

{
    if(Object.keys(tokenList).includes(chainId.toString())) {

        return tokenList[chainId];

    }
   
    return [];
}