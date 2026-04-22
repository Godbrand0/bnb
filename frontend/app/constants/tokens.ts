export interface Token {
  symbol: string;
  name: string;
  address: `0x${string}`;
  liq: string;
  ltv: string;
  status: 'PUBLISH' | 'TRADING';
  maxLtv: number;
}

export const FOUR_MEME_TOKENS: Token[] = [
  { 
    symbol: 'FOUR',   
    name: 'Four Token',   
    address: '0x1234567890123456789012345678901234567890', 
    liq: '$12.4M', 
    ltv: '70%', 
    status: 'PUBLISH',
    maxLtv: 70
  },
  { 
    symbol: 'MEME',   
    name: 'Meme World',   
    address: '0x2234567890123456789012345678901234567890', 
    liq: '$4.8M',  
    ltv: '65%', 
    status: 'TRADING',
    maxLtv: 65
  },
  { 
    symbol: 'BRGN',   
    name: 'Brgent',       
    address: '0x3234567890123456789012345678901234567890', 
    liq: '$2.1M',  
    ltv: '60%', 
    status: 'PUBLISH',
    maxLtv: 60
  },
  { 
    symbol: 'DOG',    
    name: 'Doge Agent',   
    address: '0x4234567890123456789012345678901234567890', 
    liq: '$890K',  
    ltv: '60%', 
    status: 'TRADING',
    maxLtv: 60
  },
  { 
    symbol: 'PEPE',   
    name: 'Pepe Original',
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', 
    liq: '$2.4M',  
    ltv: '60%', 
    status: 'TRADING',
    maxLtv: 60
  },
  { 
    symbol: 'SHIB',   
    name: 'Shiba Inu',
    address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', 
    liq: '$1.8M',  
    ltv: '55%', 
    status: 'TRADING',
    maxLtv: 55
  },
];
