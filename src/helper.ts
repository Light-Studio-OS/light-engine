import {
  GamepadStick,
  GamepadInterface,
  Control,
  VibrationOptions,
} from "../types/private"
import { EventEmitter } from "./EventEmitter"
import { Entity, Mouse } from "./objects"
import { Circle } from "./objects/entities"
import Vector2 from "./Vector2"

const buttonMap = [
  ["A"],
  ["B"],
  ["X"],
  ["Y"],
  ["Left Bumper", "LB"],
  ["Right Bumper", "RB"],
  ["Left Trigger", "LT"],
  ["Right Trigger", "RT"],
  ["Back", "View"],
  ["Start"],
  ["Left Stick"],
  ["Right Stick"],
  ["Up", "DpadUp"],
  ["Down", "DpadDown"],
  ["Left", "DpadLeft"],
  ["Right", "DpadRight"],
  ["Home", "Guide", "Xbox"],
]
export function findButtonNumber(button: string | number): number {
  if (typeof button === "number") return button

  let buttonNumber = 0
  for (const buttonAliases of buttonMap) {
    for (const buttonAlias of buttonAliases) {
      if (button.toLowerCase() === buttonAlias.toLowerCase()) {
        return buttonNumber
      }
    }

    buttonNumber++
  }

  throw new Error(`There is no gamepad button called "${button}"!`)
}
export const gamepadSticks: { [id: string]: GamepadStick } = {
  left: { label: "Left stick", xAxis: 0, yAxis: 1 },
  right: { label: "Right stick", xAxis: 2, yAxis: 3 },
}

export class GamepadInteractor extends EventEmitter {
  private navigator: Navigator
  private gamepadIndex: number | undefined
  private gamepadTimestamp = 0
  private cgamepad: GamepadInterface
  private store: { preferGamepad: boolean }

  constructor(nav = navigator) {
    super()
    this.navigator = nav
    this.cgamepad = null
    this.store = {
      preferGamepad: false,
    }

    this.on("add", ({ gamepad }: { gamepad: GamepadInterface }) => {
      if (this.isConnected()) return null

      if (gamepad.mapping === "standard") {
        this.cgamepad = gamepad
        this.gamepadIndex = gamepad.index
        this.store.preferGamepad = true
      }
    })

    this.on("remove", ({ gamepad }: { gamepad: GamepadInterface }) => {
      if (this.gamepadIndex !== gamepad.index) return null

      this.gamepadIndex = undefined
      this.store.preferGamepad = false
      this.offAll()
    })
  }

  isConnected(): boolean {
    return this.gamepadIndex !== undefined && this.gamepad.connected
  }

  get gamepad(): GamepadInterface {
    const gamepad = this.navigator.getGamepads()[this.gamepadIndex]
    if (!gamepad) return this.cgamepad

    if (gamepad.timestamp > this.gamepadTimestamp) {
      this.store.preferGamepad = true
      this.gamepadTimestamp = gamepad.timestamp
    }

    return gamepad
  }

  button(button: number | string): Control<boolean> {
    const buttonNumber = findButtonNumber(button)
    const label = buttonMap[buttonNumber][0]

    return {
      label,
      query: () => {
        if (!this.isConnected()) return false

        return this.gamepad.buttons[buttonNumber].pressed
      },
    }
  }

  stick(stick: string | GamepadStick): Control<Vector2> {
    let gpStick: GamepadStick
    if (typeof stick === "string") {
      if (stick in gamepadSticks) {
        gpStick = gamepadSticks[stick]
      } else {
        throw new Error(`Gamepad stick "${stick}" not found!`)
      }
    } else {
      gpStick = stick
    }

    return {
      label: gpStick.label,
      query: () => {
        if (!this.isConnected()) return new Vector2(0, 0)

        return new Vector2(
          this.gamepad.axes[gpStick.xAxis],
          this.gamepad.axes[gpStick.yAxis]
        )
      },
    }
  }

  async vibrate(
    duration: number,
    { weakMagnitude, strongMagnitude }: VibrationOptions = {}
  ): Promise<void> {
    if (!this.isConnected()) return

    const actuator = (this.gamepad as any).vibrationActuator
    if (!actuator || actuator.type !== "dual-rumble") return

    await actuator.playEffect("dual-rumble", {
      duration,
      strongMagnitude,
      weakMagnitude,
    })
  }
}

export const customStorage = new Map()
export function numberSuffix(number: number): string {
  const partsNumber = number.toString().split("")
  if (partsNumber[partsNumber.length - 1] === "1") return number + "st"
  if (partsNumber[partsNumber.length - 1] === "2") return number + "nd"
  if (partsNumber[partsNumber.length - 1] === "3") return number + "rd"
  return number + "th"
}
export function stringToPixelNum(value: string | number, nu: number): number {
  if (typeof value === "number") return value
  if (value.trim().endsWith("px")) return Number(value.replace(/px$/, ""))
  if (value.trim().endsWith("%")) {
    let p = Number(value.replace(/%$/, "")) / 100
    return nu * p
  }
  return 0
}
export function debugCenter(
  context: CanvasRenderingContext2D,
  entity: Entity | Mouse
) {
  const isMouse = typeOf(entity, true) === "Mouse"
  const isCircle = typeOf(entity) === "Circle"
  const x = entity.x
  const y = entity.y

  context.beginPath()
  context.fillStyle = "#f00"
  context.arc(
    x + (isMouse ? 0 : (entity as Entity).scene.camera.x),
    y + (isMouse ? 0 : (entity as Entity).scene.camera.y),
    2,
    0,
    Math.PI * 2
  )
  context.fill()
  context.closePath()

  if (isCircle) {
    if (!(entity as Circle).fixed)
      context.translate(
        (entity as Circle).scene.camera.x,
        (entity as Circle).scene.camera.y
      )
    context.translate(
      ((entity as Entity).width * (entity as Entity).getScale().x) / -2,
      ((entity as Entity).height * (entity as Entity).getScale().y) / -2
    )
    context.translate(
      (entity as Circle).radius *
        -(entity as Entity).getOrigin().x *
        (entity as Entity).getScale().r,
      (entity as Circle).radius *
        -(entity as Entity).getOrigin().y *
        (entity as Entity).getScale().r
    )
    context.beginPath()
    context.lineWidth = 2
    context.strokeStyle = "green"
    context.arc(
      x,
      y,
      (entity as Circle).radius * (entity as Circle).getScale().r,
      0,
      Math.PI * 2
    )
    context.stroke()
    context.closePath()
  } else if (!isMouse) {
    const body = (entity as Entity).getBodyBox()
    if (!(entity as Entity).fixed)
      context.translate(
        (entity as Entity).scene.camera.x,
        (entity as Entity).scene.camera.y
      )
    context.translate(
      ((entity as Entity).width * (entity as Entity).getScale().x) / -2,
      ((entity as Entity).height * (entity as Entity).getScale().y) / -2
    )
    context.translate(
      ((entity as Entity).width / 2) *
        -(entity as Entity).getOrigin().x *
        (entity as Entity).getScale().x,
      ((entity as Entity).height / 2) *
        -(entity as Entity).getOrigin().y *
        (entity as Entity).getScale().y
    )
    context.lineWidth = 2
    context.strokeStyle = "green"
    context.strokeRect(
      x + body.getX(),
      y + body.getY(),
      body.getWidth(),
      body.getHeight()
    )
  }
  context.setTransform(1, 0, 0, 1, 0, 0)
}
export function isDefined(v: any) {
  return v !== undefined && v !== null
}
export function isChromium() {
  return navigator.vendor === "Google Inc."
}
export function typeOf(type: any, constructor = false): string {
  if (constructor) return type.constructor.name
  if (typeof type === "object" || typeof type === "undefined") {
    if (type === null || type === undefined) return "undefined"
    if (type === Promise.prototype) return "Promise"
    if (type[Symbol.toStringTag] !== undefined) return type[Symbol.toStringTag]
    const define: string = Object.prototype.toString
      .call(type)
      .replace(/\[object (.*)\]/, (_: any, name: string) => name)
    if (
      define === "global" ||
      define === "Window" ||
      define === "DedicatedWorkerGlobalScope" ||
      define === "WorkerGlobalScope"
    ) {
      return "global"
    }
    return define
  }
  return typeof type
}
export enum StateEnum {
  Next,
  Prev,
}
export enum Warning {
  Scene,
  Entity,
  Manager,
}
export enum Errors {
  Load,
  Audio,
  ClientKey,
}
