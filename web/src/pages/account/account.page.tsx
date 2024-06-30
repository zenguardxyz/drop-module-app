import { Text, ActionIcon, Alert, Anchor, Avatar, Badge, Button, CopyButton, Divider, Input, Modal, Paper, rem, Tooltip, InputBase, Combobox, useCombobox, Group, TextInput, Skeleton, useMantineColorScheme, Notification } from '@mantine/core';
import classes from './account.module.css';
import { useEffect, useState } from 'react';
import useLinkStore from '@/store/link/link.store';
import { ethers, formatEther, formatUnits, parseEther, parseUnits, Wallet, ZeroAddress } from 'ethers';
import { buildTransferToken, formatTime, getTokenBalance, getTokenDecimals } from '@/logic/utils';
import { useDisclosure } from '@mantine/hooks';
import { IconBug, IconCheck, IconChevronDown, IconCoin, IconConfetti, IconCopy, IconX } from '@tabler/icons';
import { NetworkUtil } from '@/logic/networks';
import { getIconForId, getTokenInfo, getTokenList, tokenList } from '@/logic/tokens';
import { getJsonRpcProvider } from '@/logic/web3';

import { fetchFaucets, generateKeysFromString, generateRandomString, sendTransaction } from '@/logic/module';
import { loadAccountInfo, storeAccountInfo } from '@/utils/storage';

import DropDark from '../../assets/logo/drop-dark.svg';
import DropLight from '../../assets/logo/drop-light.svg';
import { waitForExecution } from '@/logic/permissionless';
import FixedBackground from '../home/FixedBackground';

import Safe from '../../assets/icons/safe.png';
import Coinbase from '../../assets/icons/coinbase.svg';
import Metamask from '../../assets/icons/metamask.svg';

import Confetti from 'react-confetti';





export const AccountPage = () => {

  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  
  const { claimDetails} = useLinkStore((state: any) => state);
  const [ confirming, setConfirming ] = useState(false);
  const [ balance, setBalance ] = useState<any>(0); 
  const [ error, setError ] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(true);
  const [sendLoader, setSendLoader] = useState(false);
  const [safeAccount, setSafeAccount] = useState<string>("");
  const [ authenticating, setAuthenticating ] = useState(false);
  const [ faucets, setFaucets] = useState<any[]>([{token: ''}]);
  const [ selectedFaucet, setSelectedFaucet] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [chainId, setChainId] = useState<number>(claimDetails.chainId);
  const [value, setValue] = useState<string>("0x0000000000000000000000000000000000000000");
  const [ tokenValue, setTokenValue ] = useState('');
  

  const availableTestChains = Object.keys(tokenList).filter(chainId => NetworkUtil.getNetworkById(
    Number(chainId)
  )?.type == 'testnet').map(
    (chainId: string) => 
    ({label: `${NetworkUtil.getNetworkById(Number(chainId))?.name}`, type: `${NetworkUtil.getNetworkById(
      Number(chainId)
    )?.type}`, image: getIconForId(chainId), value: chainId }))

    const availableMainnetChains = Object.keys(tokenList).filter(chainId => NetworkUtil.getNetworkById(
      Number(chainId)
    )?.type == 'mainnet').map(
      (chainId: string) => 
      ({label: `${NetworkUtil.getNetworkById(Number(chainId))?.name}`, type: `${NetworkUtil.getNetworkById(
        Number(chainId)
      )?.type}`, image: getIconForId(chainId), value: chainId }))
  
  
  const mainnetOptions = availableMainnetChains.map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

  const testnetOptions = availableTestChains.map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

  const options = (<Combobox.Options>
          <Combobox.Group >
            {mainnetOptions}
          </Combobox.Group>

          <Combobox.Group label="TESTNETS">
          {testnetOptions}
          </Combobox.Group>
        </Combobox.Options>)

  const chainCombobox = useCombobox({
    onDropdownClose: () => chainCombobox.resetSelectedOption(),
  });
  const tokenCombobox = useCombobox({
    onDropdownClose: () => tokenCombobox.resetSelectedOption(),
  });

  const faucetCombobox = useCombobox({
    onDropdownClose: () => faucetCombobox.resetSelectedOption(),
  });

  interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
    image: string
    label: string
    description: string
  }

  interface FaucetProps extends React.ComponentPropsWithoutRef<'div'> {
    account: string
    token: string
  }
  
  

  function SelectOption({ image, label }: ItemProps) {
    return (
      <Group style={{width: '100%'}}>
        <Avatar src={image} >
        <IconCoin size="1.5rem" />
        </Avatar>
        <div >
          <Text fz="sm" fw={500}>
            {label}
          </Text>
        </div>
      </Group>
    );
  }


  const selectedToken = getTokenInfo(chainId, value);

  const tokenOptions = getTokenList(chainId).map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <TokenOption {...item} />
    </Combobox.Option>
  ));

  const faucetOptions = faucets.map((faucet: any, index: number) => (
    <Combobox.Option value={index.toString()} key={index}>
      <FaucetOption {...faucet} />
    </Combobox.Option>
  ));

  interface TokenProps extends React.ComponentPropsWithoutRef<'div'> {
    image: string
    label: string
    description: string
  }

   
  function TokenOption({ image, label }: TokenProps) {
    return (
      <Group style={{width: '100%'}}>
        <Avatar src={image} >
        <IconCoin size="1.5rem" />
        </Avatar>
        <div >
          <Text fz="sm" fw={500}>
            {label}
          </Text>
        </div>
      </Group>
    );
  }

  function FaucetOption(faucet: any) {

    return (
      <Group style={{width: '100%'}}>
        <Avatar src={getTokenInfo(chainId, faucet[0])?.image} size='md' >
        </Avatar>
        <div >
          <Text fz="sm" fw={500}>
            {shortenAddress(faucet[1])}
          </Text>
        </div>
      </Group>
    );
  }



  async function sendAsset() {

    setError(false);
    setSendSuccess(false);
    setSendLoader(true);
    try {


    let parseAmount, data='0x', toAddress = sendAddress ;
    if(faucets[selectedFaucet].token == ZeroAddress) {
            parseAmount = faucets[selectedFaucet].limitAmount;
        } else {
          const provider = await getJsonRpcProvider(chainId.toString())
            // parseAmount = parseUnits(tokenValue.toString(), await  getTokenDecimals(faucets[selectedFaucet].token, provider))
            parseAmount = faucets[selectedFaucet].limitAmount
            data = await buildTransferToken(faucets[selectedFaucet].token, toAddress, parseAmount, provider)
            parseAmount = 0n;
            toAddress = faucets[selectedFaucet].token;
        }
    const result = await sendTransaction(chainId.toString(), toAddress, parseAmount, data, faucets[selectedFaucet].account, selectedFaucet)
    if (!result)
    setSendSuccess(false);
    else {
    
    setConfirming(true);
    setSendLoader(false);
    await waitForExecution(chainId.toString(), result);
    setSendSuccess(true);
    setConfirming(false);

    }
    
    
  } catch(e) {
    console.log(e)
    setError(true);
    setSendLoader(false);  
  }  
  

  }



  useEffect(() => {
    (async () => {


      setFaucetLoading(true);
      const provider = await getJsonRpcProvider(chainId.toString());

      setFaucets(await fetchFaucets(chainId.toString()))

      // setSafeAccount(faucets[faucets.length -1].account)

      // if(value == ZeroAddress) {
      //   setBalance(formatEther(await provider.getBalance(safeAccount)))
      //   } else {
      //   setBalance(await getTokenBalance(value, claimDetails?.account?.address , provider))
      //   }

      if(faucets[selectedFaucet].token == ZeroAddress) {
        setTokenValue(formatEther(faucets[selectedFaucet].limitAmount));
    } else {
      const provider = await getJsonRpcProvider(chainId.toString())
      setTokenValue(formatUnits(faucets[selectedFaucet].limitAmount, await  getTokenDecimals(faucets[selectedFaucet].token, provider)))
    }

      setFaucetLoading(false);
      window.addEventListener('resize', () => setDimensions({ width: window.innerWidth, height: window.innerHeight }));
      
    })();
  }, [ safeAccount, chainId, sendSuccess, value, confirming, selectedFaucet]);


  
  function shortenAddress(address: string) {

    let start = '0x', end=''; 
    if(address) {
     start = address.slice(0, 5);
     end = address.slice(-5);
    }
    return `${start}...${end}`;
  }

  return (
<FixedBackground>
 <>
<Modal opened={sendModal} onClose={()=>{ setSendModal(false); setValue(ZeroAddress);}} title="Claim Now" centered>

<div className={classes.formContainer}>
      <div>
        <h1 className={classes.heading}>Claim on your wallet</h1>
      </div>
      <p className={classes.subHeading}>
        Claim your drop gas free.
      </p>
      <p className={classes.normaltext}>
              Select a drop from the drop down list that would like to claim from.
      </p>
          
      
      <div className={classes.inputContainer}>
            <Input
                type="string"
                style={{ marginTop: '20px'}}
                size='lg'
                value={sendAddress}
                onChange={(e: any) => setSendAddress(e?.target?.value)}
                placeholder="Recipient Address"
                className={classes.input}
              />
              <Button
              size="lg" radius="md" 
              style={{marginBottom: '20px'}}
              fullWidth
              color="green"
              className={classes.btn}
              onClick={async () => 
                await sendAsset()}
              loaderProps={{ color: 'white', type: 'dots', size: 'md' }}
              loading={sendLoader}
            >
              Claim Now
            </Button>
            

      
            

    { sendSuccess && <Notification withBorder radius='md' withCloseButton={false}  icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />} color="teal" title="Claim success!" mt="md">
    Your have successfully claimed the drop. Buckle up for a stellar financial journey! 🚀💰
      </Notification>
      }

    
    { confirming && <Notification withBorder radius='md' loading={confirming} withCloseButton={false}  icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />} color="teal" title="Waiting to confirm" mt="md">
       The transaction have been sent. Wait for the transacion to get confirmed ⌛️
      </Notification>
      }



    { error && <Notification withBorder radius='md' withCloseButton={false}  icon={<IconX style={{ width: rem(20), height: rem(20) }} />}  color="red" title="Claim Error!" mt="md">
      Make sure you are claiming only on the supported wallet 🤝
      </Notification>
    }

    </div>

            
    </div>
  
</Modal>

    <Paper className={classes.accountContainer} shadow="md" withBorder radius="md" p="xl" >


      <div className={classes.formContainer}>
        <div className={classes.avatarContainer}>
          <img
            src={ dark ? DropDark : DropLight }
            alt="avatar"
            height={65}
            width={65}
          />
          <h1 className={classes.heading}> Claim Your Drops </h1>

            <p className={classes.subHeading}>
              Claim your drop on this chain.
            </p>

                   <Combobox
                        store={chainCombobox}
                        withinPortal={false}
                        onOptionSubmit={(val) => {
                          setChainId(Number(val));
                          chainCombobox.closeDropdown();
                        }}
                      >
                        <Combobox.Target>
                        <Badge
                                pl={0}
                                style={{ cursor: 'pointer', width: '200px', height: '40px', padding: '10px'}} 
                                
                                color="gray"
                                variant="light"
                                leftSection={
                                  <Avatar alt="Avatar for badge" size={24} mr={5} src={getIconForId(chainId)} />
                                }
                                rightSection={
                                  <IconChevronDown size={20} />
                                }
                                size="lg"
                                // className={classes.network}
                                // checked={false}
                                onClick={() => chainCombobox.toggleDropdown()}
                              > 
                                {`${NetworkUtil.getNetworkById(Number(chainId))?.name}`}
                </Badge>
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <Combobox.Options>{options}</Combobox.Options>
                        </Combobox.Dropdown>
                      </Combobox>


                      



          <p className={classes.normaltext}>
              Select a drop from the drop down list that would like to claim from.
            </p>
          
          
        </div>

        <div className={classes.actionsContainer}>

      
          <div className={classes.actions}>

            


          <Combobox
                        store={faucetCombobox}
                        withinPortal={false}
                        onOptionSubmit={(val) => {
                          setSelectedFaucet(Number(val));
                          faucetCombobox.closeDropdown();
                        }}
                      >
                        <Combobox.Target>
                        <Badge
                                pl={0}
                                style={{ cursor: 'pointer', width: '200px', height: '54px', padding: '10px'}} 
                                radius='md'
                                color="gray"
                                variant="light"
                                leftSection={
                                  <Avatar alt="Avatar for badge" size={24} mr={5} src={getTokenInfo(chainId, faucets[selectedFaucet].token)?.image} />
                                }
                                rightSection={
                                  <IconChevronDown size={20} />
                                }
                                size="lg"
                                // className={classes.network}
                                // checked={false}
                                onClick={() => faucetCombobox.toggleDropdown()}
                              > 
                                {`${shortenAddress(faucets[selectedFaucet].account)}`}
                       </Badge>
                        </Combobox.Target>
                        <Combobox.Dropdown>
                          <Combobox.Options>{faucetOptions}</Combobox.Options>
                        </Combobox.Dropdown>
                </Combobox>
            <Button size="lg" radius="md"className={classes.btn} color="teal" onClick={()=> setSendModal(true)}>
              Claim
            </Button>
          </div>

      { !faucetLoading && <Paper radius="md" withBorder className={classes.card} mt={20}>
      <Text ta="center" fw={700} className={classes.title}>
        Drop details
      </Text>


      <Group justify="space-between" mt="xs">
        <Text fz="sm" c="dimmed">
          Claimable:
        </Text>
        <Text fz="sm" c="dimmed">
          { tokenValue} 
        </Text>
      </Group>

      <Group justify="space-between" mt="xs">
        <Text fz="sm" c="dimmed">
          Token
        </Text>
        <Group >
        <Avatar src={getTokenInfo(chainId, faucets[selectedFaucet].token).image} size='sm' >
        </Avatar>
        <Text fz="sm" c="dimmed">
        { getTokenInfo(chainId, faucets[selectedFaucet].token).label } 
        </Text>
        </Group>
      </Group>


      <Group justify="space-between" mt="xs">
        <Text fz="sm" c="dimmed">
          Claim Every:
        </Text>
        <Text fz="sm" c="dimmed">
          { formatTime(Number(faucets[selectedFaucet].refreshInterval)) } 
        </Text>
      </Group>


      <Group justify="space-between" mt="xs">
        <Text fz="sm" c="dimmed">
          Claimable Wallets
        </Text>
        <Group >
       { faucets[selectedFaucet].safe.supported && <Avatar radius='sm' src={ Safe } size='sm' /> }
       { faucets[selectedFaucet].cbSW.supported && <Avatar radius='sm' src={ Coinbase } size='sm' /> }
       { faucets[selectedFaucet].eoa.supported && <Avatar radius='sm' src={ Metamask } size='sm' /> }
        </Group>
      </Group>



{/* 
     { refreshIn > 0n && <Group justify="space-between" mt="md">
        <Text fz="sm">Refreshes in:</Text>
       <Badge color='green' size="sm"> {formatTime(Number(refreshIn))} </Badge>
      </Group> } */}
    </Paper> }

          
        </div>
      </div>
    </Paper>

    </>
    { sendSuccess && <Confetti
      width={dimensions.width - 20}
      height={dimensions.height - 20}
    />
    }
  </FixedBackground>
  
  );
};