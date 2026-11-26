# Welcome to LNDg - A Power-User LND Auto-Rebalancer
## PLEASE NOTE: This auto-rebalancing service has been developed specifically for use by LND Routing Node Operators. 
Manual Re-Balancing can be achieved using Ride the Lightning or Thunderhub.

The objective of the Auto-Rebalancer is to automatically "refill" the liquidity on the local side (i.e. OUTBOUND) of profitable and lucarative channels. So that, when a forward comes in from another node there is always enough liquidity to route the payment and in return collect the desired routing fees.

**LNDg is *very* useful if you are a vendor accepting lightning payments, constantly looking for inbound liquidity, or a lightning spender constantly looking for outbound liquiduty.**
## Upgrading on StartOS 0.3.5.x

Stop LNDg and wait for StartOS to show it as stopped. Install the update over the existing service, then start LNDg. Startup applies the database migrations to the existing data volume. Your forwarding history, LNDg settings, and administrator login carry over.

## Instructions for LNDg

You can login using the username "lndg-admin".

Your admin password can be found on the properties page.

<!-- MD_PACKER_INLINE BEGIN -->
![screenshot with step 1-2](./assets/step1.png)
![screenshot with step 3](./assets/step3.png)
<!-- MD_PACKER_INLINE END -->


For more information on how to use this service, please visit their [README.md](https://github.com/cryptosharks131/lndg/blob/master/README.md#auto-rebalancer)
