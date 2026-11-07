import FinanceSettings, { DEFAULT_FINANCE_SETTINGS } from '../models/FinanceSettings.js'

export const getFinanceSettings = async (req, res, next) => {
  try {
    const settings = (await FinanceSettings.findOne({ organization: req.user.organization }).lean()) || { ...DEFAULT_FINANCE_SETTINGS, organization: req.user.organization }
    res.status(200).json({ success: true, data: { settings } })
  } catch (error) {
    next(error)
  }
}

export const updateFinanceSettings = async (req, res, next) => {
  try {
    const set = Object.fromEntries(Object.entries(req.body.lateFee || {}).map(([k, v]) => [`lateFee.${k}`, v]))
    const settings = await FinanceSettings.findOneAndUpdate(
      { organization: req.user.organization },
      { $set: set, $setOnInsert: { organization: req.user.organization } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
    res.status(200).json({ success: true, message: 'Rent rules saved.', data: { settings } })
  } catch (error) {
    next(error)
  }
}
