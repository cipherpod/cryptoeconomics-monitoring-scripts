import {setupWeb3, setupContracts, defineBlockRange} from './utils/setup_utils';
import {printInfo, setupBar, printSuccess} from './utils/dialog_utils';
import {saveData} from './utils/file_utils';

const syncBundles = async (): Promise<void> => {
  const web3 = await setupWeb3(process.env.ENVIRONMENT);

  const {bundleStoreWrapper, shelteringWrapper, blockchainStateWrapper, rolesWrapper} = await setupContracts(web3);
  const {toBlock, fromBlock} = await defineBlockRange(blockchainStateWrapper);

  printInfo(`Fetching ${process.env.NUMBER_OF_BLOCKS_TO_SYNC} blocks (${fromBlock} -> ${toBlock})`);
  const bundleStorageEvents = await bundleStoreWrapper.bundlesStored(fromBlock, toBlock);
  printInfo(`${bundleStorageEvents.length} events successfully extracted`);

  printInfo(`Processing events...`);
  const progressBar = await setupBar(bundleStorageEvents.length);

  let gatheredBundlesData = [];

  for(let index = 0; index < bundleStorageEvents.length; index++) {
    const bundleDataFromEvent = {
      bundleId: bundleStorageEvents[index].returnValues.bundleId,
      uploaderId: bundleStorageEvents[index].returnValues.uploader,
      blockHash: bundleStorageEvents[index].blockHash,
      blockNumber: bundleStorageEvents[index].blockNumber,
      transactionHash: bundleStorageEvents[index].transactionHash,
      signature: bundleStorageEvents[index].signature
    };

    const storagePeriods =  await shelteringWrapper.bundleStoragePeriods(bundleDataFromEvent.bundleId);
    const nodeUrl = await rolesWrapper.nodeUrl(bundleDataFromEvent.uploaderId);
    const bundleUrl = `${nodeUrl}/bundle/${bundleDataFromEvent.bundleId}`;
    const completeBundleData = {...bundleDataFromEvent, storagePeriods, bundleUrl};

    gatheredBundlesData.push(completeBundleData);
    progressBar.increment(1);
  }

  printInfo(`Saving output...`)
  await saveData(gatheredBundlesData, 'bundles.json');
  
  printSuccess(`Done!`);
};

syncBundles();