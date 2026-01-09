/**
 * Pre-extracted sample data from HAR files for simulation mode
 * Extracted from docs/requests/ directory
 */

import type { CheckSlotsResult, CreateReservationResult } from './client.ts'

/**
 * Sample CheckSlotsResult data extracted from successful API responses
 */
export const sampleCheckSlotsResults: CheckSlotsResult[] = [
	{
		amount: 32,
		slots: [
			{ date: '2026-01-12', raw: '2026-01-12' },
			{ date: '2026-01-13', raw: '2026-01-13' },
			{ date: '2026-01-16', raw: '2026-01-16' },
			{ date: '2026-01-19', raw: '2026-01-19' },
			{ date: '2026-01-20', raw: '2026-01-20' },
			{ date: '2026-01-21', raw: '2026-01-21' },
			{ date: '2026-01-23', raw: '2026-01-23' },
			{ date: '2026-01-28', raw: '2026-01-28' },
			{ date: '2026-02-02', raw: '2026-02-02' },
			{ date: '2026-02-03', raw: '2026-02-03' },
			{ date: '2026-02-04', raw: '2026-02-04' },
			{ date: '2026-02-09', raw: '2026-02-09' },
			{ date: '2026-02-10', raw: '2026-02-10' },
			{ date: '2026-02-11', raw: '2026-02-11' },
			{ date: '2026-02-16', raw: '2026-02-16' },
			{ date: '2026-02-17', raw: '2026-02-17' },
			{ date: '2026-02-23', raw: '2026-02-23' },
			{ date: '2026-02-24', raw: '2026-02-24' },
			{ date: '2026-02-25', raw: '2026-02-25' },
			{ date: '2026-03-02', raw: '2026-03-02' },
			{ date: '2026-03-03', raw: '2026-03-03' },
			{ date: '2026-03-04', raw: '2026-03-04' },
			{ date: '2026-03-09', raw: '2026-03-09' },
			{ date: '2026-03-10', raw: '2026-03-10' },
			{ date: '2026-03-11', raw: '2026-03-11' },
			{ date: '2026-03-16', raw: '2026-03-16' },
			{ date: '2026-03-17', raw: '2026-03-17' },
			{ date: '2026-03-18', raw: '2026-03-18' },
			{ date: '2026-03-23', raw: '2026-03-23' },
			{ date: '2026-03-24', raw: '2026-03-24' },
			{ date: '2026-03-25', raw: '2026-03-25' },
			{ date: '2026-03-30', raw: '2026-03-30' }
		],
		locationId: 191,
		consulateId: 112,
		serviceType: 1,
		token: '853efca5-ffdf-4e72-8011-bda93d91e1ce',
		identityToken: undefined
	},
	{
		amount: 31,
		slots: [
			{ date: '2026-01-12', raw: '2026-01-12' },
			{ date: '2026-01-13', raw: '2026-01-13' },
			{ date: '2026-01-16', raw: '2026-01-16' },
			{ date: '2026-01-19', raw: '2026-01-19' },
			{ date: '2026-01-20', raw: '2026-01-20' },
			{ date: '2026-01-21', raw: '2026-01-21' },
			{ date: '2026-01-23', raw: '2026-01-23' },
			{ date: '2026-01-28', raw: '2026-01-28' },
			{ date: '2026-02-02', raw: '2026-02-02' },
			{ date: '2026-02-03', raw: '2026-02-03' },
			{ date: '2026-02-04', raw: '2026-02-04' },
			{ date: '2026-02-09', raw: '2026-02-09' },
			{ date: '2026-02-10', raw: '2026-02-10' },
			{ date: '2026-02-11', raw: '2026-02-11' },
			{ date: '2026-02-16', raw: '2026-02-16' },
			{ date: '2026-02-17', raw: '2026-02-17' },
			{ date: '2026-02-23', raw: '2026-02-23' },
			{ date: '2026-02-24', raw: '2026-02-24' },
			{ date: '2026-02-25', raw: '2026-02-25' },
			{ date: '2026-03-02', raw: '2026-03-02' },
			{ date: '2026-03-03', raw: '2026-03-03' },
			{ date: '2026-03-04', raw: '2026-03-04' },
			{ date: '2026-03-09', raw: '2026-03-09' },
			{ date: '2026-03-10', raw: '2026-03-10' },
			{ date: '2026-03-11', raw: '2026-03-11' },
			{ date: '2026-03-16', raw: '2026-03-16' },
			{ date: '2026-03-17', raw: '2026-03-17' },
			{ date: '2026-03-18', raw: '2026-03-18' },
			{ date: '2026-03-23', raw: '2026-03-23' },
			{ date: '2026-03-24', raw: '2026-03-24' },
			{ date: '2026-03-25', raw: '2026-03-25' }
		],
		locationId: 191,
		consulateId: 112,
		serviceType: 1,
		token: '5cffa906-27b0-4fcf-9d24-611060bfac8b',
		identityToken: undefined
	}
]

/**
 * Sample CreateReservationResult data extracted from successful API responses
 */
export const sampleCreateReservationResults: CreateReservationResult[] = [
	{
		ticket:
			'DAAAAFwCQ92yzzy54zBzeRAAAAB9sISJ7N10ne6tVcnpHNFEBTRMvUgyOrERv4By+upYLZRCj9MseezrQldI1tLxXFpHNqKHOFo8UkCM1aEKx2OFioRRg17Kh+WcXwfsgxuy0VaH1xpQzxKpVkH28YXP6AKnIiVT3KVvdmO8ZEUTnBar11OuikTI9ITMaq6GHcMq+6Z4fpb1fWt24GQ2PMkvh7leeTRewcWwIjmgn11A83Fj/MPqzZ6//zlOZy5yligsbWXl4rFEPXbgfyNJF7FDSJNGT3VK2p9YNIes7swUEkk24j7Tv/OLKyd7D0ghXHqEgMZTZHkhEUB6a8urw1d9+HY5LFZdUlSz9tGVcxJDaTNKj3DrrLCHU9ryKHZIYSE0atu6sk6HeHLC/poTlBsthC4eh94G9hSDVjOYDfZGqU6ju3CcjD5zHjMCMedh77xS+aVeAfqTkJPtah4bAx+7eW87ahejwb/77ND9G+igujuOGladEPMzqhbnO7tUB3gdxXTSs096FeMk/6oVvn8+wK3AtaXF+8z9hrD4um9iX2foTte2pw9tI+KfKjtBHWU/K7tQiWsgOY2tOv7ygxc=',
		tickets: [
			{
				ticket:
					'DAAAAFwCQ92yzzy54zBzeRAAAAB9sISJ7N10ne6tVcnpHNFEBTRMvUgyOrERv4By+upYLZRCj9MseezrQldI1tLxXFpHNqKHOFo8UkCM1aEKx2OFioRRg17Kh+WcXwfsgxuy0VaH1xpQzxKpVkH28YXP6AKnIiVT3KVvdmO8ZEUTnBar11OuikTI9ITMaq6GHcMq+6Z4fpb1fWt24GQ2PMkvh7leeTRewcWwIjmgn11A83Fj/MPqzZ6//zlOZy5yligsbWXl4rFEPXbgfyNJF7FDSJNGT3VK2p9YNIes7swUEkk24j7Tv/OLKyd7D0ghXHqEgMZTZHkhEUB6a8urw1d9+HY5LFZdUlSz9tGVcxJDaTNKj3DrrLCHU9ryKHZIYSE0atu6sk6HeHLC/poTlBsthC4eh94G9hSDVjOYDfZGqU6ju3CcjD5zHjMCMedh77xS+aVeAfqTkJPtah4bAx+7eW87ahejwb/77ND9G+igujuOGladEPMzqhbnO7tUB3gdxXTSs096FeMk/6oVvn8+wK3AtaXF+8z9hrD4um9iX2foTte2pw9tI+KfKjtBHWU/K7tQiWsgOY2tOv7ygxc=',
				date: '2026-03-17',
				time: '',
				verifiedIdentity: undefined,
				isChildApplication: false
			}
		],
		verifiedIdentity: undefined,
		isChildApplication: false
	},
	{
		ticket:
			'DAAAAH9cp0gmtJVjfVuDlRAAAABqPfKFegiAG3OXI6b8ElZRImkwuNxHq3OKgtFowAq+olmUvXNGnxB8214niRMmBJ84pnaFTbGyIX3ZtdwitQG8Sk/Wk+Ja9xlp6aomJYNUvoaesyERoRKoSo1eVguQ7TUvufoxjmjU+mD+5ZBWOQJPOsEmfFl6Hd0Mb2BW4YVVHQGwECHNnjajzL9G46syRxaxxb1qe3/PKTQBq+/4JfTjGR7V4wi+Kgn2C+HSA1B2aLvah8LZUlGyuY2eJbPoR2A4yMswFmm/nNlKd5TuEZL4d47VKA3jvhYwGTY0aXokFT0aGx4eAoeBjRhu5sBi0WBZA7wbGmhiG5niSy+RmI7DJ5xjnCICVCr/qWkYqndfT9UqZMrHbGJ+lHzQR4lNq6N8zgPUUh8lOUFpLpwLBnzg8Vk2lNSCKQMatzHOKRje3/7tMpirNW7sRzrxtxNY7AXLVtpTf3wfQ0AX0YY4CBcUXYsYmlsIlyQHj61un0RrsBuZIlsJF5oBbZU2FNGeUK+MnCPPMPNjkp1HfUCQmCnY4M+2faP2VOXWdPatIc6z8vi5eOfPdvvoIFhONj/4ZA==',
		tickets: [
			{
				ticket:
					'DAAAAH9cp0gmtJVjfVuDlRAAAABqPfKFegiAG3OXI6b8ElZRImkwuNxHq3OKgtFowAq+olmUvXNGnxB8214niRMmBJ84pnaFTbGyIX3ZtdwitQG8Sk/Wk+Ja9xlp6aomJYNUvoaesyERoRKoSo1eVguQ7TUvufoxjmjU+mD+5ZBWOQJPOsEmfFl6Hd0Mb2BW4YVVHQGwECHNnjajzL9G46syRxaxxb1qe3/PKTQBq+/4JfTjGR7V4wi+Kgn2C+HSA1B2aLvah8LZUlGyuY2eJbPoR2A4yMswFmm/nNlKd5TuEZL4d47VKA3jvhYwGTY0aXokFT0aGx4eAoeBjRhu5sBi0WBZA7wbGmhiG5niSy+RmI7DJ5xjnCICVCr/qWkYqndfT9UqZMrHbGJ+lHzQR4lNq6N8zgPUUh8lOUFpLpwLBnzg8Vk2lNSCKQMatzHOKRje3/7tMpirNW7sRzrxtxNY7AXLVtpTf3wfQ0AX0YY4CBcUXYsYmlsIlyQHj61un0RrsBuZIlsJF5oBbZU2FNGeUK+MnCPPMPNjkp1HfUCQmCnY4M+2faP2VOXWdPatIc6z8vi5eOfPdvvoIFhONj/4ZA==',
				date: '2026-01-13',
				time: '',
				verifiedIdentity: undefined,
				isChildApplication: false
			}
		],
		verifiedIdentity: undefined,
		isChildApplication: false
	}
]
