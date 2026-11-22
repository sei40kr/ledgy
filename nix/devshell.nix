{ inputs, pkgs, ... }:
let
  pre-commit-check = import ./checks/pre-commit-check.nix { inherit inputs pkgs; };
in
pkgs.mkShell {
  packages = with pkgs; [
    nodejs_22
    # the Firestore emulator needs a JDK to run
    jdk21_headless
    terraform
    google-cloud-sdk
  ];

  shellHook = ''
    ${pre-commit-check.shellHook}
  '';
}
