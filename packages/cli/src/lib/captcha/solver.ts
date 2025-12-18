import * as tf from '@tensorflow/tfjs-node'

// Constants matching the Python model
const CAPTCHA_LENGTH = 4
const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#+='
const IMG_WIDTH = 200
const IMG_HEIGHT = 100
const PREPROCESSED_WIDTH = 200
const PREPROCESSED_HEIGHT = 100

const intToChar = new Map(CHARSET.split('').map((char, i) => [i, char]))

export interface Init {
	path: string
}

export class Solver implements AsyncDisposable {
	private model: tf.GraphModel | null = null
	private modelPromise: Promise<tf.GraphModel> | null = null

	private readonly modelPath: string

	constructor(init: Init) {
		this.modelPath = init.path
	}

	async initialize(): Promise<void> {
		if (this.model) {
			return
		}

		if (this.modelPromise) {
			await this.modelPromise
			return
		}

		this.modelPromise = (async () => {
			try {
				const loadedModel = await tf.loadGraphModel(`file://${this.modelPath}`)
				this.model = loadedModel
				return loadedModel
			} catch (error) {
				this.modelPromise = null
				throw new Error(
					`Failed to load CAPTCHA model from ${this.modelPath}: ${error instanceof Error ? error.message : String(error)}`
				)
			}
		})()

		await this.modelPromise
	}

	async solveCaptcha(input: Buffer): Promise<string> {
		if (!Buffer.isBuffer(input) || input.length === 0) {
			throw new Error('Invalid input: expected non-empty Buffer')
		}

		await this.initialize()

		if (!this.model) {
			throw new Error('Model initialization failed')
		}

		let preprocessed: tf.Tensor3D | null = null

		try {
			preprocessed = this.preprocessImage(input)
			const predictions = tf.tidy(() => {
				if (!preprocessed) {
					throw new Error('Preprocessed tensor is null')
				}
				const inputTensor = preprocessed.expandDims(0)

				if (!this.model) {
					throw new Error('Model not initialized')
				}
				const output = this.model.predict(inputTensor)

				// Model outputs 4 separate tensors (one per character)
				if (!Array.isArray(output)) {
					throw new Error('Unexpected model output format')
				}

				if (output.length !== CAPTCHA_LENGTH) {
					throw new Error(`Expected ${CAPTCHA_LENGTH} outputs, got ${output.length}`)
				}

				return output as tf.Tensor[]
			})

			const outputOrder = [0, 2, 3, 1]
			const chars: string[] = new Array(CAPTCHA_LENGTH)

			for (let i = 0; i < predictions.length; i++) {
				const prediction = predictions[i]
				if (!prediction) {
					throw new Error(`Prediction at index ${i} is undefined`)
				}

				const values = await prediction.data()
				const maxIndex = values.indexOf(Math.max(...Array.from(values)))
				const char = intToChar.get(maxIndex)

				if (!char) {
					throw new Error(`Invalid character index: ${maxIndex}`)
				}

				const position = outputOrder[i]
				if (position === undefined) {
					throw new Error(`Output order at index ${i} is undefined`)
				}
				chars[position] = char
				prediction.dispose()
			}

			return chars.join('')
		} catch (error) {
			throw new Error(
				`Failed to solve CAPTCHA: ${error instanceof Error ? error.message : String(error)}`
			)
		} finally {
			if (preprocessed) {
				preprocessed.dispose()
			}
		}
	}

	private preprocessImage(imageData: Buffer): tf.Tensor3D {
		return tf.tidy(() => {
			let image = tf.node.decodePng(imageData, 1)
			image = tf.image.resizeBilinear(image, [IMG_HEIGHT, IMG_WIDTH])

			const threshold = 130
			const mask = tf.greater(image, threshold)
			image = tf.where(mask, tf.fill(image.shape, 255.0), tf.fill(image.shape, 0.0)) as tf.Tensor3D

			const cropTop = Math.floor(IMG_HEIGHT * 0.1)
			const cropLeft = Math.floor(IMG_WIDTH * 0.1)
			const cropHeight = Math.floor(IMG_HEIGHT * 0.9) - cropTop
			const cropWidth = Math.floor(IMG_WIDTH * 0.9) - cropLeft

			image = tf.slice(image, [cropTop, cropLeft, 0], [cropHeight, cropWidth, 1]) as tf.Tensor3D
			image = tf.image.resizeBilinear(image, [PREPROCESSED_HEIGHT, PREPROCESSED_WIDTH])
			image = image.div(255.0)

			return image.reshape([PREPROCESSED_HEIGHT, PREPROCESSED_WIDTH, 1]) as tf.Tensor3D
		})
	}

	dispose(): void {
		if (this.model) {
			this.model.dispose()
			this.model = null
			this.modelPromise = null
		}
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.dispose()
	}
}
