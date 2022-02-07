import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import TransactionFactory from '@project-serum/anchor/dist/cjs/program/namespace/transaction';
import { publicKey, token } from '@project-serum/anchor/dist/cjs/utils';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Faucet } from '../target/types/faucet';

const { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } = anchor.web3;

describe('faucet', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Faucet as Program<Faucet>;
  const payer = anchor.web3.Keypair.generate();

  console.log("program id:", program.programId.toBase58());

  let tokenMint: Token;
  let programWalletPda: anchor.web3.PublicKey;
  let programWalletPdaBump: number;
  let associatedTokenAccount: anchor.web3.PublicKey;
  let associatedTokenAccountBump: number;

  // it('Is initialized!', async () => {
  //   // Add your test here.
  //   const tx = await program.rpc.initialize({});
  //   console.log("Your transaction signature", tx);
  // });
  it('request airdrop', async () => {
    const airdropTxHash = await program.provider.connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await program.provider.connection.confirmTransaction(airdropTxHash);

    console.log("airdropTxHash:", airdropTxHash);
    console.log('payer:', payer.publicKey.toBase58());
  });

  it('init token', async () => {
    tokenMint = await Token.createMint(
      program.provider.connection, // connection
      payer, // payer
      payer.publicKey, // mint authority
      null, // freeze authorityk
      9, // decimal
      TOKEN_PROGRAM_ID
    );

    console.log("create mint:", tokenMint.publicKey.toBase58());
  });

  it('create associated token account', async () => {
    [programWalletPda, programWalletPdaBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('program_wallet'))
      ],
      program.programId
    );

    console.log('programWalletPda:', programWalletPda.toBase58());

    [associatedTokenAccount, associatedTokenAccountBump] = await PublicKey.findProgramAddress(
      [
        programWalletPda.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMint.publicKey.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('associatedTokenAccount:', associatedTokenAccount.toBase58());
    console.log('associatedTokenAccountBump:', associatedTokenAccountBump);
  });

  it('initialize', async () => {
    const txHash = await program.rpc.initialize(
      {
        accounts: {
          tokenAssociated: associatedTokenAccount,
          programAuthority: programWalletPda,
          payer: payer.publicKey,
          tokenMint: tokenMint.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        },
        signers: [payer]
      }
    );

    console.log('initialize txHash:', txHash);
  });

  it('mint', async () => {
    const [receiverAssociatedTokenAccount, receiverAssociatedTokenAccountBump] = await PublicKey.findProgramAddress(
      [
        payer.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMint.publicKey.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [mintAuthority, mintAuthorityBump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("mint_authority"))],
      program.programId,
    );

    const txHash = await program.rpc.mintForMe(mintAuthorityBump, programWalletPdaBump, {
      accounts: {
        payerAssociatedTokenAccount: receiverAssociatedTokenAccount,
        programAssociatedTokenAccount: associatedTokenAccount,
        programAuthority: programWalletPda,
        mintAuthority: mintAuthority,
        payer: payer.publicKey,
        tokenMint: tokenMint.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      },
      signers: [payer]
    });

    console.log('mintForMe txHash:', txHash);
  });

  // it('initialize', async () => {
  //   const [pda, pdaBump] = publicKey.findProgramAddressSync(
  //     [Buffer.from(anchor.utils.bytes.utf8.encode("pda"))],
  //     program.programId
  //   );

  //   program.rpc.initialize({
  //     accounts: {
  //       payer: payer,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId
  //     },
  //     signers: [payer],
  //   });

  //   const associatedTokenAccount = await token.associatedAddress({
  //     mint: '',
  //     owner
  //   });


  //   console.log("pda:", pda.toBase58());
  //   console.log("programId:", program.programId.toBase58());
  // });
});
