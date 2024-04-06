import _ from "lodash"
import moment from "moment"
import fs from "node:fs"
import yaml from "yaml"
import plugin from "../../../lib/plugins/plugin.js"
import { Version } from "../components/index.js"
import { status } from "../constants/other.js"
import { common, QQApi } from "../model/index.js"
import { sleep } from "../tools/index.js"

/** API请求错误文案 */
const API_ERROR = "❎ 出错辣，请稍后重试"

// 命令正则
let FriendsReg = /^#发好友\s?(\d+)\s?([^]*)$/
let GroupMsgReg = /^#发群聊\s?(\d+)\s?([^]*)$/
let GroupListMsgReg = /^#发群列表\s?(\d+(,\d+){0,})\s?([^]*)$/
let friendTypeReg = /^#更改好友申请方式([0123])((.*)\s(.*))?$/

export class Assistant extends plugin {
  constructor() {
    super({
      name: "椰奶小助手",
      event: "message",
      priority: 2000,
      rule: [
        {
          reg: "^#改头像",
          fnc: "SetAvatar"
        },
        {
          reg: "^#改昵称",
          fnc: "SetNickname"
        },
        {
          reg: "^#改签名",
          fnc: "SetSignature"
        },
        {
          reg: "^#改状态",
          fnc: "SetOnlineStatus"
        },
        {
          reg: FriendsReg, // 发好友
          fnc: "SendFriendMsg"
        },
        {
          reg: GroupMsgReg, // 发群聊
          fnc: "SendGroupMsg"
        },
        {
          reg: GroupListMsgReg, // 发群列表
          fnc: "SendGroupListMsg"
        },
        {
          reg: "^#退群",
          fnc: "QuitGroup"
        },
        {
          reg: "^#删好友",
          fnc: "DeleteFriend"
        },
        {
          reg: "^#改性别",
          fnc: "SetGender"
        },
        {
          reg: "^#取直链",
          fnc: "ImageLink"
        },
        {
          reg: "^#取face",
          fnc: "Face"
        },
        {
          reg: "^#获?取说说列表(\\d+)?$",
          fnc: "Qzonelist"
        },
        {
          reg: "^#删说说(\\d+)$",
          fnc: "Qzonedel"
        },
        {
          reg: "^#发说说",
          fnc: "Qzonesay"
        },
        {
          reg: "^#(清空说说|清空留言)$",
          fnc: "QzonedelAll"
        },
        {
          reg: "^#改群名片",
          fnc: "SetGroupCard"
        },
        {
          reg: "^#改群头像",
          fnc: "SetGroupAvatar"
        },
        {
          reg: "^#改群昵称",
          fnc: "SetGroupName"
        },
        {
          reg: "^#获取(群|好友)列表$",
          fnc: "GlOrFl"
        },
        {
          reg: "^#(开启|关闭)戳一戳$",
          fnc: "Cyc"
        },
        {
          reg: "^#?撤回$",
          fnc: "RecallMsgown"
        },
        {
          reg: "^#(开启|关闭)好友添加$",
          fnc: "FriendSwitch"
        },
        {
          reg: friendTypeReg, // 更改好友申请方式
          fnc: "FriendType"
        },
        {
          reg: "#设置机型.*", // 更改好友申请方式
          fnc: "setModel"
        },
        {
          reg: "^#拉[黑白](群聊?)?",
          fnc: "BlockOne"
        },
        {
          reg: "^#(取消|(删|移)除)拉[黑白](群聊?)?",
          fnc: "CancelBlockOne"
        }
      ]
    })
  }

  get Bot() {
    return this.e.bot ?? Bot
  }

  /**
   * 改头像
   * @param e
   */
  async SetAvatar(e) {
    if (!common.checkPermission(e, "master")) return
    if (!e.img) {
      this.setContext("_avatarContext")
      e.reply("⚠ 请发送图片")
      return
    }

    await this.Bot.setAvatar(e.img[0])
      .then(() => e.reply("✅ 头像修改成功"))
      .catch((err) => {
        e.reply("❎ 头像修改失败")
        logger.error(err)
      })
  }

  async _avatarContext() {
    let img = this.e.img
    if (/取消/.test(this.e.msg)) {
      this.finish("_avatarContext")
      await this.reply("✅ 已取消")
      return
    }
    if (!img) {
      this.setContext("_avatarContext")
      await this.reply("⚠ 请发送图片或取消")
      return
    }
    await (this.e.bot ?? Bot).setAvatar(img[0])
      .then(() => this.e.reply("✅ 头像修改成功"))
      .catch((err) => {
        this.e.reply("❎ 头像修改失败")
        logger.error(err)
      })

    this.finish("_avatarContext")
  }

  /**
   * 改昵称
   * @param e
   */
  async SetNickname(e) {
    if (!common.checkPermission(e, "master")) return
    let name = e.msg.replace(/#|改昵称/g, "").trim()

    await this.Bot.setNickname(name)
      .then(() => e.reply("✅ 昵称修改成功"))
      .catch((err) => {
        e.reply("❎ 昵称修改失败")
        logger.error(err)
      })
  }

  /**
   * 改群名片
   * @param e
   */
  async SetGroupCard(e) {
    if (!common.checkPermission(e, "master")) return
    let group = ""
    let card = ""

    if (e.isPrivate) {
      let msg = e.msg.split(" ")

      group = msg[1].match(/[1-9]\d*/g)

      card = msg.slice(2).join(" ")

      if (!group) return e.reply("❎ 群号不能为空")

      if (!this.Bot.gl.get(Number(msg[1]))) return e.reply("❎ 群聊列表查无此群")
    } else {
      group = e.group_id
      card = e.msg.replace(/#|改群名片/g, "").trim()
    }

    if (!card) {
      return e.reply("❎ 名片不能为空")
    }
    this.Bot.pickGroup(group).setCard(this.Bot.uin, card)
      .then(() => e.reply("✅ 群名片修改成功"))
      .catch(err => {
        e.reply("✅ 群名片修改失败")
        logger.error(err)
      })
  }

  /**
   * 改群头像
   * @param e
   */
  async SetGroupAvatar(e) {
    if (e.isPrivate) {
      if (!e.isMaster) return logger.mark(`${e.logFnc}不为主人`)
      e.group_id = e.msg.replace(/#|改群头像/g, "").trim()

      if (!e.group_id) return e.reply("❎ 群号不能为空")

      if (!(/^\d+$/.test(e.group_id))) return e.reply("❎ 您的群号不合法")

      if (!this.Bot.gl.get(Number(e.group_id))) return e.reply("❎ 群聊列表查无此群")
      e.group_id = Number(e.group_id)
    } else if (!e.member.is_admin && !e.member.is_owner && !e.isMaster) {
      return logger.mark(`${e.logFnc}该群员权限不足`)
    }
    let groupObj = this.Bot.pickGroup(e.group_id)
    if (!groupObj.is_admin && !groupObj.is_owner) {
      return e.reply("❎ 没有管理员人家做不到啦~>_<")
    }
    if (!e.img) {
      this.setContext("_GroupAvatarContext")
      e.reply("⚠ 请发送图片")
      return
    }

    this.Bot.pickGroup(e.group_id).setAvatar(e.img[0])
      .then(() => e.reply("✅ 群头像修改成功"))
      .catch((err) => {
        e.reply("✅ 群头像修改失败")
        logger.error(err)
      })
  }

  _GroupAvatarContext(e) {
    let img = this.e.img
    if (/取消/.test(this.e.msg)) {
      this.finish("_GroupAvatarContext")
      this.e.reply("✅ 已取消")
      return
    }
    if (!img) {
      this.setContext("_GroupAvatarContext")
      this.e.reply("⚠ 请发送图片或取消")
      return
    }
    this.Bot.pickGroup(e.group_id).setAvatar(this.e.img[0])
      .then(() => this.e.reply("✅ 群头像修改成功"))
      .catch((err) => {
        this.e.reply("✅ 群头像修改失败")
        logger.error(err)
      })

    this.finish("_GroupAvatarContext")
  }

  /**
   * 改群昵称
   * @param e
   */
  async SetGroupName(e) {
    if (!common.checkPermission(e, "admin", "admin")) return
    let group = ""
    let card = ""

    if (e.isPrivate) {
      if (!e.isMaster) return

      let msg = e.msg.split(" ")
      group = msg[1].match(/[1-9]\d*/g)
      card = msg.slice(2).join(" ")

      if (!group) return e.reply("❎ 群号不能为空")
      if (!this.Bot.gl.get(Number(msg[1]))) return e.reply("❎ 群聊列表查无此群")
    } else {
      if (!e.member.is_admin && !e.member.is_owner && !e.isMaster) return logger.mark(`${e.logFnc}该群员权限不足`)
      group = e.group_id
      card = e.msg.replace(/#|改群昵称/g, "").trim()
    }

    if (!card) return e.reply("❎ 昵称不能为空")

    group = Number(group)

    if (this.Bot.pickGroup(group).is_admin || this.Bot.pickGroup(group).is_owner) {
      this.Bot.pickGroup(group).setName(card)
        .then(() => e.reply("✅ 群昵称修改成功"))
        .catch(err => {
          e.reply("✅ 群昵称修改失败")
          logger.error(err)
        })
    } else {
      return e.reply("❎ 没有管理员人家做不到啦~>_<")
    }
  }

  /**
   * 改签名
   * @param e
   */
  async SetSignature(e) {
    if (!common.checkPermission(e, "master")) return
    let signs = e.msg.replace(/#|改签名/g, "").trim()
    await this.Bot.setSignature(signs)
      .then(() => e.reply("✅ 签名修改成功"))
      .catch((err) => {
        e.reply("❎ 签名修改失败")
        logger.error(err)
      })
  }

  /**
   * 改状态
   * @param e
   */
  async SetOnlineStatus(e) {
    if (!common.checkPermission(e, "master")) return
    let signs = e.msg.replace(/#|改状态/g, "").trim()

    if (!signs) return e.reply("❎ 状态不为空，可选值：我在线上，离开，隐身，忙碌，Q我吧，请勿打扰")

    let statusMirr = _.invert(status)
    if (!(signs in statusMirr)) return e.reply("❎ 可选值：我在线上，离开，隐身，忙碌，Q我吧，请勿打扰")

    await this.Bot.setOnlineStatus(statusMirr[signs])
      .then(() => e.reply(`✅ 现在的在线状态为【${status[this.Bot.status]}】`))
      .catch(err => {
        e.reply("❎ 在线状态修改失败")
        logger.error(err)
      })
    return true
  }

  /**
   * 发好友
   * @param e
   */
  async SendFriendMsg(e) {
    if (!common.checkPermission(e, "master")) return
    let regRet = FriendsReg.exec(e.msg)
    let qq = regRet[1]
    e.message[0].text = regRet[2]
    if (!/^\d+$/.test(qq)) return e.reply("❎ QQ号不正确，人家做不到的啦>_<~")

    if (!this.Bot.fl.get(Number(qq))) return e.reply("❎ 好友列表查无此人")

    if (!e.message[0].text) e.message.shift()

    if (e.message.length === 0) return e.reply("❎ 消息不能为空")

    await this.Bot.pickFriend(qq).sendMsg(e.message)
      .then(() => e.reply("✅ 私聊消息已送达"))
      .catch(err => common.handleException(e, err, { MsgTemplate: "❎ 发送失败\n错误信息为:{error}" }))
  }

  /**
   * 发群聊
   * @param e
   */
  async SendGroupMsg(e) {
    if (!common.checkPermission(e, "master")) return
    let regRet = GroupMsgReg.exec(e.msg)

    let gpid = regRet[1]

    e.message[0].text = regRet[2]

    if (!e.message[0].text) e.message.shift()

    if (e.message.length === 0) return e.reply("❎ 消息不能为空")

    if (!/^\d+$/.test(gpid)) return e.reply("❎ 您输入的群号不合法")

    if (!this.Bot.gl.get(Number(gpid))) return e.reply("❎ 群聊列表查无此群")

    await this.Bot.pickGroup(gpid).sendMsg(e.message)
      .then(() => e.reply("✅ 群聊消息已送达"))
      .catch((err) => common.handleException(e, err, { MsgTemplate: "❎ 发送失败\n错误信息为:{error}" }))
  }

  // 发送群列表
  async SendGroupListMsg(e) {
    if (!common.checkPermission(e, "master")) return
    // 获取参数
    let regRet = GroupListMsgReg.exec(e.msg)
    let gpid = regRet[1]
    e.message[0].text = regRet[3]

    if (!e.message[0].text) e.message.shift()

    if (e.message.length === 0) return e.reply("❎ 消息不能为空")

    let groupidList = []
    let sendList = []

    // 获取群列表
    let listMap = Array.from(this.Bot.gl.values())

    listMap.forEach((item) => {
      groupidList.push(item.group_id)
    })

    let groupids = gpid.split(",")

    if (!groupids.every(item => item <= groupidList.length)) return e.reply("❎ 序号超过合法值！！！")

    groupids.forEach((item) => {
      sendList.push(groupidList[Number(item) - 1])
    })

    if (sendList.length > 3) return e.reply("❎ 不能同时发太多群聊，号寄概率增加！！！")

    if (sendList.length === 1) {
      await this.Bot.pickGroup(sendList[0]).sendMsg(e.message)
        .then(() => e.reply("✅ " + sendList[0] + " 群聊消息已送达"))
        .catch((err) =>
          common.handleException(e, err, { MsgTemplate: `❎ ${sendList[0]} 发送失败\n错误信息为:{error}` })
        )
    } else {
      e.reply("发送多个群聊，将每5秒发送一条消息！")
      for (let i of sendList) {
        await this.Bot.pickGroup(i).sendMsg(e.message)
          .then(() => e.reply("✅ " + i + " 群聊消息已送达"))
          .catch((err) =>
            common.handleException(e, err, { MsgTemplate: `❎ ${i} 发送失败\n错误信息为:{error}` }))
        await sleep(5000)
      }
    }
    return false
  }

  /**
   * 退群
   * @param e
   */
  async QuitGroup(e) {
    if (!common.checkPermission(e, "master")) return
    let quits = e.msg.replace(/#|退群/g, "").trim()

    if (!quits) return e.reply("❎ 群号不能为空")

    if (!/^\d+$/.test(quits)) return e.reply("❎ 群号不合法")

    if (!this.Bot.gl.get(Number(quits))) return e.reply("❎ 群聊列表查无此群")

    if (quits == e.group_id) {
      e.reply("✅ 3秒后退出本群聊")
      await sleep(3000)
    }

    await this.Bot.pickGroup(quits).quit()
      .then(() => e.reply("✅ 已退出群聊"))
      .catch((err) => {
        e.reply("❎ 退出失败")
        logger.error(err)
      })
  }

  /**
   * 删好友
   * @param e
   */
  async DeleteFriend(e) {
    if (!common.checkPermission(e, "master")) return
    let quits = e.msg.replace(/#|删好友/g, "").trim()

    if (e.message[1]) {
      quits = e.message[1].qq
    } else {
      quits = quits.match(/[1-9]\d*/g)
    }
    if (!quits) return e.reply("❎ 请输入正确的QQ号")

    if (!this.Bot.fl.get(Number(quits))) return e.reply("❎ 好友列表查无此人")

    await this.Bot.pickFriend(quits).delete()
      .then(() => e.reply("✅ 已删除好友"))
      .catch((err) => {
        e.reply("❎ 删除失败")
        logger.error(err)
      })
  }

  /**
   * 改性别
   * @param e
   */
  async SetGender(e) {
    if (!common.checkPermission(e, "master")) return
    let sex = e.msg.replace(/#|改性别/g, "").trim()

    if (!sex) return e.reply("❎ 性别不能为空 可选值：男，女，无\n（改为无，为无性别）")

    let res = {
      无: 0,
      男: 1,
      女: 2
    }
    if (!(sex in res)) return e.reply("❎ 可选值：男，女，无(改为无，为无性别)")

    await this.Bot.setGender(res[sex])
      .then(() => e.reply("✅ 已修改性别"))
      .catch((err) => {
        e.reply("❎ 修改失败")
        logger.error(err)
      })
  }

  /**
   * 取直链
   * @param e
   */
  async ImageLink(e) {
    let img = []
    if (e.source) {
      let source
      if (e.isGroup) {
        source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
      } else {
        source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
      }
      for (let i of source.message) {
        if (i.type == "image") {
          img.push(i.url)
        }
      }
    } else {
      img = e.img
    }

    if (_.isEmpty(img)) {
      this.setContext("_ImageLinkContext")
      await this.reply("⚠ 请发送图片")
      return
    }
    await e.reply(`✅ 检测到${img.length}张图片`)
    if (img.length >= 2) {
      // 大于两张图片以转发消息发送
      let msg = []
      for (let i of img) {
        msg.push([ segment.image(i), "直链:", i ])
      }
      common.getforwardMsg(e, msg)
    } else {
      await e.reply([ segment.image(img[0]), "直链:", img[0] ])
    }
    return true
  }

  async _ImageLinkContext() {
    let img = this.e.img
    if (this.e.msg === "取消") {
      this.finish("_ImageLinkContext")
      await this.reply("✅ 已取消")
      return
    }
    if (!img) {
      this.setContext("_ImageLinkContext")
      await this.reply("⚠ 请发送图片或取消")
      return
    }
    await this.e.reply(img[0])
    this.finish("_ImageLinkContext")
  }

  /**
   * 取Face表情
   * @param e
   */
  async Face(e) {
    let face = []
    for (let m of e.message) {
      if (m.type === "face") {
        let s = false
        for (let i of face) { if (i.id === m.id) s = true }
        if (!s) face.push(m)
      }
    }
    if (face.length === 0) return e.reply("❎ 表情参数不可为空", true)

    let res = face.map(function(item) {
      return [
        "表情：",
        item,
        `\nid：${item.id}`,
        `\n描述：${item.text}`
      ]
    })

    if (res.length >= 2) {
      common.getforwardMsg(e, res)
    } else {
      e.reply(res[0])
    }
  }

  /**
   * QQ空间 说说列表
   * @param e
   */
  async Qzonelist(e) {
    if (!common.checkPermission(e, "master")) return
    let page = e.msg.replace(/#|获?取说说列表/g, "").trim()
    if (!page) {
      page = 0
    } else {
      page = page - 1
    }

    // 获取说说列表
    let list = await new QQApi(e).getQzone(5, page * 5)

    if (!list) return e.reply(API_ERROR)
    if (list.total == 0) return e.reply("✅ 说说列表为空")

    let msg = [
      "✅ 获取成功，说说列表如下:\n",
      ...list.msglist.map((item, index) =>
        `${page * 5 + index + 1}.${_.truncate(item.content, { length: 15 })}\n- [${item.secret ? "私密" : "公开"}] | ${moment(item.created_time * 1000).format("MM/DD HH:mm")} | ${item.commentlist?.length || 0}条评论\n`
      ),
      `页数：[${page + 1}/${Math.ceil(list.total / 5)}]`
    ]
    e.reply(msg)
  }

  /**
   * 删除说说
   * @param e
   */
  async Qzonedel(e) {
    if (!common.checkPermission(e, "master")) return
    let pos = e.msg.match(/\d+/)
    // 获取说说列表
    let list = await new QQApi(e).getQzone(1, pos - 1)

    if (!list) return e.reply(API_ERROR)
    if (!list.msglist) return e.reply("❎ 未获取到该说说")

    // 要删除的说说
    let domain = list.msglist[0]
    // 请求接口
    let result = await new QQApi(e).delQzone(domain.tid, domain.t1_source)
    if (!result) return e.reply(API_ERROR)
    // debug
    logger.debug(e.logFnc, result)

    if (result.subcode != 0) e.reply("❎ 未知错误" + JSON.parse(result))
    // 发送结果
    e.reply(`✅ 删除说说成功：\n ${pos}.${_.truncate(domain.content, { length: 15 })} \n - [${domain.secret ? "私密" : "公开"}] | ${moment(domain.created_time * 1000).format("MM/DD HH:mm")} | ${domain.commentlist?.length || 0} 条评论`)
  }

  /**
   * 发说说
   * @param e
   */
  async Qzonesay(e) {
    if (!common.checkPermission(e, "master")) return
    let con = e.msg.replace(/#|发说说/g, "").trim()
    let result = await new QQApi(e).setQzone(con, e.img)
    if (!result) return e.reply(API_ERROR)

    if (result.code != 0) return e.reply(`❎ 说说发表失败\n${JSON.stringify(result)}`)

    let msg = [ "✅ 说说发表成功，内容：\n", _.truncate(result.content, { length: 15 }) ]
    if (result.pic) {
      msg.push(segment.image(result.pic[0].url1))
    }
    msg.push(`\n- [${result.secret ? "私密" : "公开"}] | ${moment(result.t1_ntime * 1000).format("MM/DD HH:mm")}`)
    e.reply(msg)
  }

  /**
   * 清空说说和留言
   * @param e
   */
  async QzonedelAll(e) {
    if (!common.checkPermission(e, "master")) return
    if (/清空说说/.test(e.msg)) {
      this.setContext("_QzonedelAllContext")
      e.reply("✳️ 即将删除全部说说请发送：\n" + "------确认清空或取消------")
      e.Qzonedetermine = true
    } else if (/清空留言/.test(e.msg)) {
      this.setContext("_QzonedelAllContext")
      e.reply("✳️ 即将删除全部留言请发送：\n" + "------确认清空或取消------")
      e.Qzonedetermine = false
    }
  }

  async _QzonedelAllContext(e) {
    let msg = this.e.msg
    if (/#?确认清空/.test(msg)) {
      this.finish("_QzonedelAllContext")
      let result
      if (e.Qzonedetermine) {
        result = await new QQApi(this.e).delQzoneAll()
      } else {
        result = await new QQApi(this.e).delQzoneMsgbAll()
      }

      this.e.reply(result)
      return true
    } else if (/#?取消/.test(msg)) {
      this.finish("_QzonedelAllContext")
      this.e.reply("✅ 已取消")
      return false
    } else {
      this.setContext("_QzonedelAllContext")
      this.e.reply("❎ 请输入:确认清空或取消")
      return false
    }
  }

  // 获取群|好友列表
  async GlOrFl(e) {
    if (!common.checkPermission(e, "master")) return
    let msg = []
    if (/群列表/.test(e.msg)) {
      // 获取群列表并转换为数组
      let listMap = Array.from(this.Bot.gl.values())
      msg = [
        `群列表如下，共${listMap.length}个群`,
        listMap.map((item, index) => `${index + 1}、${item.group_name}(${item.group_id})`).join("\n"),
        "可使用 #退群123456789 来退出某群",
        "可使用 #发群列表 <序号> <消息> 来快速发送消息，多个群聊请用 \",\" 分隔 不能大于3 容易寄"
      ]
    } else {
      // 获取好友列表并转换为数组
      let listMap = Array.from(this.Bot.fl.values())
      msg = [
        `好友列表如下，共${listMap.length}个好友`,
        listMap.map((item, index) => `${index + 1}、${item.nickname}(${item.user_id})`).join("\n"),
        "可使用 #删好友123456789 来删除某人"
      ]
    }

    common.getforwardMsg(e, msg)
  }

  // 引用撤回
  async RecallMsgown(e) {
    if (!e.source) return false
    let source
    if (e.isGroup) {
      source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
    } else {
      source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
    }
    let target = e.isGroup ? e.group : e.friend

    if (e.isGroup) {
      // 群聊判断权限
      if (!e.isMaster && !e.member.is_owner && !e.member.is_admin) { return logger.warn(`${e.logFnc}该群员权限不足`) }
    } else {
      // 私聊判断是否为Bot消息
      if (source.sender.user_id != this.Bot.uin) { return logger.warn(`${e.logFnc}引用不是Bot消息`) }
    }
    if (source.message[0].type === "file" && e.isGroup) {
      // 删除文件
      logger.info(`${e.logFnc}执行删除文件`)
      await this.Bot.acquireGfs(e.group_id).rm(source.message[0].fid)
    } else {
      // 撤回消息
      logger.info(`${e.logFnc}执行撤回消息`)
      await target.recallMsg(source.message_id)
    }
    await sleep(300)
    let recallcheck = await this.Bot.getMsg(source.message_id)
    if (recallcheck && recallcheck.message_id == source.message_id) {
      let msg
      if (e.isGroup) {
        if (!e.group.is_admin && !e.group.is_owner) {
          msg = "人家连管理员都木有，怎么撤回两分钟前的消息或别人的消息辣o(´^｀)o"
        } else {
          msg = "干不赢这个淫的辣（｀Δ´）ゞ"
        }
      } else {
        msg = "过了两分钟，吃不掉辣(o｀ε´o)"
      }
      return e.reply(msg, true, { recallMsg: 5 })
    }
    if (e.isGroup) await e.recall()
  }

  // 开关好友添加
  async FriendSwitch(e) {
    if (!common.checkPermission(e, "master")) return
    let res = await new QQApi(e).addFriendSwitch(/开启/.test(e.msg) ? 1 : 2)
    if (!res) return e.reply(API_ERROR)
    e.reply(res.ActionStatus)
  }

  // 好友申请方式
  async FriendType(e) {
    if (!common.checkPermission(e, "master")) return
    let regRet = friendTypeReg.exec(e.msg)
    if (regRet[1] == 0) return e.reply("1为允许所有人，2为需要验证，3为问答正确问答(需填问题和答案，格式为：#更改好友申请方式3 问题 答案)")
    // 单独处理
    if ((!regRet[3] || !regRet[4]) && regRet[1] == 3) return e.reply("❎ 请正确输入问题和答案！")

    let res = await new QQApi(e).setFriendType(regRet[1], regRet[3], regRet[4])
    if (!res) return e.reply(API_ERROR)
    if (res.ec != 0) return e.reply("❎ 修改失败\n" + JSON.stringify(res))
    e.reply(res.msg)
  }

  /**
   * 开关戳一戳
   * @param e
   */
  async Cyc(e) {
    if (!common.checkPermission(e, "master")) return
    let result = await new QQApi(e).setcyc(/开启/.test(e.msg) ? 0 : 1)
    if (!result) return e.reply(API_ERROR)

    if (result.ret != 0) return e.reply("❎ 未知错误\n" + JSON.stringify(result))
    e.reply(`✅ 已${/开启/.test(e.msg) ? "开启" : "关闭"}戳一戳功能`)
  }

  async setModel(e) {
    if (!common.checkPermission(e, "master")) return
    let model = e.msg.replace(/#|设置机型/g, "")
    let res = await new QQApi(e).setModel(model).catch(err => logger.error(err))
    e.reply(_.get(res, [ "13031", "data", "rsp", "iRet" ]) == 0 ? "设置成功" : "设置失败")
  }

  async BlockOne(e) {
    if (!common.checkPermission(e, "master")) return
    let type = ""
    let name = "拉"
    if (/^#拉白(群聊?)?/.test(this.e.msg)) {
      type += "white"
      name += "白"
    } else {
      type += "black"
      name += "黑"
    }
    if (/^#拉[黑白](群聊?)/.test(this.e.msg)) {
      type += "Group"
      name += "群"
    } else {
      type += Version.name == "TRSS-Yunzai" ? "User" : "QQ"
    }
    const configPath = "config/config/other.yaml"
    /** 判断at */
    if (this.e.at) {
      this.blackResult = this.e.at
    } else {
      if (Version.name == "TRSS-Yunzai") {
        /** TRSS-Yunzai匹配所有字符 */
        const blackId = this.e.msg.replace(/^#拉[黑白](群聊?)?/, "").trim()
        this.blackResult = Number(blackId) || String(blackId)
      } else {
        const match = this.e.msg.match(/\d+/)
        if (match?.[0]) { this.blackResult = Number(match[0]) || String(match[0]) }
      }
    }
    if (!this.blackResult) { return this.e.reply(`❎ ${name}失败，没有键入用户或群号`) }
    try {
      const yamlContentBuffer = await fs.promises.readFile(configPath)
      const yamlContent = yamlContentBuffer.toString("utf-8")
      const data = yaml.parse(yamlContent)
      if (!Array.isArray(data[type])) { data[type] = [] }
      if (!data[type].includes(this.blackResult)) {
        data[type].push(this.blackResult)
        const updatedYaml = yaml.stringify(data, { quote: false })
        const resultYaml = updatedYaml.replace(/"/g, "")
        await fs.promises.writeFile(configPath, resultYaml, "utf-8")
        await this.e.reply(`✅ 已把这个坏淫${name}掉惹！！！`)
      } else {
        await this.e.reply(`❎ 已把这个坏淫${name}过辣`)
      }
    } catch (error) {
      await this.e.reply(`❎ 额...${name}失败哩，可能这个淫比较腻害>_<`)
      logger.error(error)
    }
  }

  async CancelBlockOne(e) {
    if (!common.checkPermission(e, "master")) return
    let type = ""
    let name = "取消拉"
    if (/^#(取消|删除|移除)(群聊?)?拉白(群聊?)?/.test(this.e.msg)) {
      type += "white"
      name += "白"
    } else {
      type += "black"
      name += "黑"
    }
    if (/^#(取消|删除|移除)拉[黑白](群聊?)/.test(this.e.msg)) {
      type += "Group"
      name += "群"
    } else {
      type += Version.name == "TRSS-Yunzai" ? "User" : "QQ"
    }
    const configPath = "config/config/other.yaml"
    if (this.e.at) {
      this.blackResult = this.e.at
    } else {
      if (Version.name == "TRSS-Yunzai") {
        const blackId = this.e.msg.replace(/^#(取消|(删|移)除)拉[黑白](群聊?)?/, "").trim()
        this.blackResult = Number(blackId) || String(blackId)
      } else {
        const match = this.e.msg.match(/\d+/)
        if (match?.[0]) { this.blackResult = Number(match[0]) || String(match[0]) }
      }
    }
    if (!this.blackResult) { return this.e.reply(`❎ ${name}失败，没有键入用户或群号`) }
    try {
      const yamlContentBuffer = await fs.promises.readFile(configPath)
      const yamlContent = yamlContentBuffer.toString("utf-8")
      const data = yaml.parse(yamlContent)
      if (Array.isArray(data[type]) && data[type].includes(this.blackResult)) {
        const itemToRemove = this.blackResult.toString()
        data[type] = data[type].filter(item => item.toString() !== itemToRemove)
        const updatedYaml = yaml.stringify(data)
        await fs.promises.writeFile(configPath, updatedYaml, "utf-8")
        await this.e.reply(`✅ 已把这个坏淫${name}掉惹！！！`)
      } else {
        await this.e.reply(`❎ ${name}失败，找不到辣>_<`)
      }
    } catch (error) {
      await this.e.reply(`❎ 额...${name}失败哩，可能这个淫比较腻害>_<`)
      logger.error(error)
    }
  }
}
