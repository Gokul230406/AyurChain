import fs from 'fs';

async function main() {
  const FarmCert = await ethers.getContractFactory('FarmCert');
  const farmCert = await FarmCert.deploy();
  await farmCert.waitForDeployment();
  const address = await farmCert.getAddress();
  console.log('FarmCert deployed to:', address);
  
  // Save the contract address
  fs.writeFileSync('farmCertAddress.txt', address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
