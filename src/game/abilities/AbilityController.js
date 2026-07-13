import { JumpAbility } from "./JumpAbility.js";
import { DoubleJumpAbility } from "./DoubleJumpAbility.js";
import { WallParkourAbility } from "./WallParkourAbility.js";
import { GlideAbility } from "./GlideAbility.js";
import { DashAbility } from "./DashAbility.js";
import { SpectralAttackAbility } from "./SpectralAttackAbility.js";

export class AbilityController {
  constructor(player) {
    this.jump = new JumpAbility(player);
    this.doubleJump = new DoubleJumpAbility(player);
    this.wallParkour = new WallParkourAbility(player);
    this.glide = new GlideAbility(player);
    this.dash = new DashAbility(player);
    this.attack = new SpectralAttackAbility(player);
  }
}
