// src/instructions/mod.rs
pub mod initialize;
pub mod claim;
pub mod update_config;
pub mod set_vault;

// Re-exporting them for cleaner access in lib.rs
pub use initialize::*;
pub use claim::*;
pub use update_config::*;
pub use set_vault::*;