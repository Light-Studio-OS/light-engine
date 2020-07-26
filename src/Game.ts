import { EventEmitter } from "./EventEmitter"
import { Errors, stringToPixelNum, StateEnum, isDefined } from "./helper"
import { Scene, Entity } from "./objects"
import FpsCtrl from "./FpsController"
import { EntityManager, SceneManager } from "./managers"
import { ConfigOption } from "../types/private"
import Mouse from "./objects/Mouse"
import Keyboard from "./objects/Keyboard"
import Gamepad from "./objects/Gamepad"

export default class Game<S = { [x: string]: any }> extends EventEmitter {
  public canvas: HTMLCanvasElement
  public state: S
  public debug: boolean
  public fps: number
  public loop: FpsCtrl
  public context: CanvasRenderingContext2D
  public sceneManager: SceneManager
  public currentScene: Scene
  public playedWithOpacity: Scene[]
  public mouse: Mouse
  public keyboard: Keyboard
  public gamepad: Gamepad

  public secondsPassed = 0
  private oldTimeStamp = 0
  private inited: Function[] = []
  constructor(
    config: ConfigOption,
    public w: string | number = 800,
    public h: string | number = 600
  ) {
    super()
    this.playedWithOpacity = []
    this.debug = config.debug
    this.update = this.update.bind(this)
    this.initScene = this.initScene.bind(this)
    this.canvas =
      typeof config.canvas === "object" &&
      config.canvas instanceof HTMLCanvasElement
        ? config.canvas
        : document.body.appendChild(document.createElement("canvas"))

    const p = this.canvas.parentNode as Element
    this.canvas.width = stringToPixelNum(w, p.clientWidth)
    this.canvas.height = stringToPixelNum(h, p.clientHeight)
    const prev = { w: this.canvas.width, h: this.canvas.height }
    if (
      typeof w === "string" &&
      w.trim().endsWith("%") &&
      typeof h === "string" &&
      h.trim().endsWith("%")
    )
      this.globals.on("window:resize", () => {
        if (
          typeof w === "string" &&
          w.trim().endsWith("%") &&
          prev.w !== p.clientWidth
        )
          this.canvas.width = stringToPixelNum(w, p.clientWidth)
        if (
          typeof h === "string" &&
          h.trim().endsWith("%") &&
          prev.h !== p.clientHeight
        )
          this.canvas.height = stringToPixelNum(h, p.clientHeight)
      })

    if (config.pixel) this.canvas.style.imageRendering = "pixelated"

    this.context = this.canvas.getContext("2d")
    this.sceneManager = config.scene(this)
    let toLoad = Object.keys(config.load || {})

    if (typeof config.loadScene !== "undefined") {
      const toForcedLoading = config.loadScene.forcedLoadingOfEntities || []
      toLoad = toLoad.filter((v) => !toForcedLoading.includes(v))
      toForcedLoading.forEach((name: string) => {
        config.load[name]
          .then((media) => EntityManager.addMedia(name, media))
          .catch((reason) => this.globals.emit("e" + Errors.Load, reason))
      })
      this.playScene(config.loadScene)
    }
    toLoad.forEach((name: string) => {
      config.load[name]
        .then((media) => EntityManager.addMedia(name, media))
        .catch((reason) => this.globals.emit("e" + Errors.Load, reason))
    })
    this.sceneManager.play(0)
    this.loop = new FpsCtrl(240, this.update)
    this.loop.start()
    this.mouse = new Mouse(this)
    this.keyboard = new Keyboard()
    this.gamepad = new Gamepad()
  }
  playScene(scene: Scene) {
    if (
      !isDefined(this.currentScene) ||
      this.currentScene.changeAllow(scene, StateEnum.Next) ||
      (isDefined(scene) && scene.changeAllow(this.currentScene, StateEnum.Prev))
    ) {
      scene.emit("called", this.currentScene)
      if (this.currentScene) {
        this.currentScene.played = false
        this.currentScene.isPlayed = "none"
      }
      scene.played = true
      scene.isPlayed = "main"
      this.currentScene = scene
      this.playedWithOpacity = []
    }
    return this.currentScene
  }
  private initScene(entities: Entity[], scene: Scene) {
    if (!this.inited.includes(scene.init)) {
      this.inited = [...this.inited, scene.init]
      scene.init()
      for (const entity of entities) {
        entity.init()
      }
    }
    if (scene.isPlayed === "main") {
      for (const scene of this.playedWithOpacity) {
        this.initScene(scene.entities.getAll(), scene)
      }
    }
  }
  private update(o: { time: number; frame: number }) {
    const entities = this.currentScene.entities.getAll()
    this.initScene(entities, this.currentScene)

    this.setFPS(o.time)
    this.mouse.update()
    this.emit("updated")
    this.globals.emit("window:resize")
    this.currentScene.beforeUpdate()
    for (const entity of entities) {
      if (entity.collide(this.mouse)) entity.emit("mouse:hover", entity)
      if (entity.collide(this.mouse) && this.mouse.click)
        entity.emit("mouse:click", entity)
      entity.beforeRedraw()
      entity.redraw(this.secondsPassed)
      entity.emit("move:velocity", entity)
    }
    for (const scene of this.playedWithOpacity) {
      const entities = scene.entities.getAll()
      scene.beforeUpdate()
      for (const entity of entities) {
        if (entity.collide(this.mouse)) entity.emit("mouse:hover")
        if (entity.collide(this.mouse) && this.mouse.click)
          entity.emit("mouse:click")
        entity.beforeRedraw()
        entity.redraw(this.secondsPassed)
        entity.emit("move:velocity", entity)
      }
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.save()
    this.context.globalAlpha = 1
    this.context.fillStyle = "#000"
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.restore()
    for (const entity of entities) {
      if (!entity.hidden) entity.draw(this.context)
      entity.afterRedraw()
    }
    for (const scene of this.playedWithOpacity) {
      const entities = scene.entities.getAll()
      for (const entity of entities) {
        entity.draw(this.context)
        entity.afterRedraw()
      }
      scene.update(this.secondsPassed)
      scene.afterUpdate()
    }
    this.context.globalAlpha = 1
    this.mouse.draw(this.context)
    this.currentScene.update(this.secondsPassed)
    this.currentScene.afterUpdate()
  }
  private setFPS(timestamp: number) {
    this.secondsPassed = (timestamp - this.oldTimeStamp) / 1000
    this.oldTimeStamp = timestamp
    this.fps = Math.round(1 / this.secondsPassed)
  }
}