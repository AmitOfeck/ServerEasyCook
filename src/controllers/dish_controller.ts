import * as DishService from '../services/dish_service'
import {Request, Response} from 'express'

export async function findAll(req: Request, res: Response) {

    try {
        const all_dishes = await DishService.findAll()
        res.status(200).send(all_dishes)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}
export async function findOne(req: Request, res: Response) {

    try {
        const {key, value} = req.body
        const found = await DishService.findOneBy(key,value)
        res.status(200).send(found)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}
export async function findById(req: Request, res: Response) {

    try {
        const id = req.params.id
        const found = await DishService.findById(id)
        res.status(200).send(found)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}
export async function findMany(req: Request, res: Response) {

    try {
        const {key, value} = req.body
        const found = await DishService.findManyBy(key,value)
        res.status(200).send(found)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}

export async function insertDish(req: Request, res: Response) {

    try {
        const dish_body = req.body
        const created = await DishService.insertDish(dish_body)
        res.status(200).send(created)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}

export async function updateDish(req: Request, res: Response) {

    try {
        const id = req.params.id
        const dish_body = req.body
        const created = await DishService.updateDish(id, dish_body)
        res.status(200).send(created)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}

export async function deleteDish(req: Request, res: Response) {

    try {
        const id = req.params.id
        const deleted = await DishService.deleteDish(id)
        res.status(200).send(deleted)
    } catch(err: any) {
        console.log(err);
        res.status(400).send(err);
    }
}