#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, Address, Map};

#[contract]
pub struct CarbonCredits;

#[contractimpl]
impl CarbonCredits {

    // Mint carbon credits
    pub fn mint(env: Env, to: Address, amount: i128) {
        let mut balances: Map<Address, i128> = env.storage().instance().get(&Symbol::new(&env, "BAL")).unwrap_or(Map::new(&env));

        let current = balances.get(to.clone()).unwrap_or(0);
        balances.set(to.clone(), current + amount);

        env.storage().instance().set(&Symbol::new(&env, "BAL"), &balances);
    }

    // Transfer credits
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let mut balances: Map<Address, i128> = env.storage().instance().get(&Symbol::new(&env, "BAL")).unwrap();

        let from_balance = balances.get(from.clone()).unwrap_or(0);
        assert!(from_balance >= amount, "Insufficient balance");

        balances.set(from.clone(), from_balance - amount);

        let to_balance = balances.get(to.clone()).unwrap_or(0);
        balances.set(to.clone(), to_balance + amount);

        env.storage().instance().set(&Symbol::new(&env, "BAL"), &balances);
    }

    // Check balance
    pub fn balance(env: Env, user: Address) -> i128 {
        let balances: Map<Address, i128> = env.storage().instance().get(&Symbol::new(&env, "BAL")).unwrap_or(Map::new(&env));
        balances.get(user).unwrap_or(0)
    }
}