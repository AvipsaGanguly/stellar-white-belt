import { requestAccess, getAddress } from "@stellar/freighter-api";

export const checkWallet = async () => {
  try {
    const access = await requestAccess();
    console.log("Access:", access);

    const address = await getAddress();
    console.log("Address:", address);

    return address.address;
  } catch (error) {
    console.error(error);
    return null;
  }
};