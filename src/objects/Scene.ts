import { EventEmitter } from "../EventEmitter"
import { Game } from "../app"
import { SceneOption, int, TextStyle } from "../../types/private"
import { SceneManager, EntityManager, AudioManager } from "../managers"
import { Entity } from "."
import World from "./World"
import BoundingBox from "./BoundingBox"
import { Rectangle, Circle, Image, Sprite, Text } from "./entities"
import { StateEnum } from "../helper"
import Camera from "./entities/Camera"

export default class Scene extends EventEmitter {
  public get [Symbol.toStringTag]() {
    return "Scene"
  }
  public name: string
  public game: Game
  public manager: SceneManager
  public forcedLoadingOfEntities: Array<string> = []
  public entities: EntityManager
  public played: boolean
  public isPlayed: "none" | "opacity" | "main"
  public alpha: number

  public world: World
  public camera: Camera
  public create: any

  constructor(option: SceneOption) {
    super()
    this.entities = new EntityManager(this)
    this.world = new World(this)
    this.name = option.name
    this.isPlayed = "none"
    this.played = false
    this.alpha = 1
    const self = this
    this.create = {
      box(
        x: int,
        y: int,
        width: int,
        height: int,
        entities: Array<Entity> = []
      ) {
        const box = new BoundingBox(self.world, x, y, width, height)
        entities.forEach((entity) => box.moveEntity(entity))
        return box
      },
      entity: {
        rectangle(
          x: number,
          y: number,
          w: number,
          h: number,
          fillColor?: string | number,
          zindex = 0
        ) {
          const rect = new Rectangle(self, x, y, w, h)
          rect.zindex = zindex
          rect.fillColor = fillColor
          self.entities.add(rect)
          return rect
        },
        circle(
          x: number,
          y: number,
          r: number,
          fillColor?: string | number,
          zindex = 0
        ) {
          const circ = new Circle(self, x, y, r)
          circ.zindex = zindex
          circ.fillColor = fillColor
          self.entities.add(circ)
          return circ
        },
        image(x: number, y: number, use: string, zindex = 0) {
          const img = new Image(self, x, y, use)
          img.zindex = zindex
          self.entities.add(img)
          return img
        },
        sprite(
          x: number,
          y: number,
          use: string,
          spriteWidth: number,
          spriteHeight: number,
          zindex = 0
        ) {
          const srt = new Sprite(self, x, y, use)
          srt.sprite.width = spriteWidth
          srt.sprite.height = spriteHeight
          srt.zindex = zindex
          self.entities.add(srt)
          return srt
        },
        text(
          x: number,
          y: number,
          content: string,
          style: TextStyle = {},
          zindex = 0
        ) {
          const img = new Text(self, x, y, content, style)
          img.zindex = zindex
          self.entities.add(img)
          return img
        },
      },
    }
    this.camera = new Camera(this)
    this.entities.add(this.camera)
  }
  init() {}
  beforeUpdate() {}
  update(secondsPassed: number) {}
  afterUpdate() {}
  changeAllow(scene: Scene, state: StateEnum) {
    return true
  }
  getAudio(name: string) {
    const audio = this.entities.medias.audios.get(name)
    if (audio) return new AudioManager(audio, name)
  }
  setName(value: string) {
    this.name = value
    return this
  }
  setGame(value: Game) {
    this.game = value
    return this
  }
  setManager(value: SceneManager) {
    this.manager = value
    return this
  }
}