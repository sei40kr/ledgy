{
  description = "account-ledgers dev shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              # terraform is BUSL-licensed, so nixpkgs treats it as unfree
              config.allowUnfree = true;
            }
          )
        );
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            # the Firestore emulator needs a JDK to run
            jdk21_headless
            terraform
            google-cloud-sdk
          ];
        };
      });
    };
}
