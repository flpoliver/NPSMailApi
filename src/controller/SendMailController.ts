import { Request, Response } from "express";
import { resolve } from 'path';
import { getCustomRepository } from "typeorm";
import AppError from "../errors/AppError";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UserRepository } from "../repositories/UserRepository";
import SendMailService from "../services/SendMailService";


class SendMailController {

  async execute(req: Request, res: Response) {
    const { email, survey_id } = req.body;

    const usersRepository = getCustomRepository(UserRepository);
    const surveysRepository = getCustomRepository(SurveysRepository);
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

    const user = await usersRepository.findOne({email});

    if(!user) {throw new AppError("User does not exist")}

    const survey = await surveysRepository.findOne({id: survey_id});

    if(!survey) {throw new AppError("Survey does not exist")}

    const npsMailPath = resolve(__dirname, "..", "views","emails","npsMail.hbs");

    const surveyUserAlreadyExist = await surveysUsersRepository.findOne({
      where: {user_id: user.id, value: null},
      relations: ["user", "surveys"],
    });

    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      id: "",
      link: process.env.URL_MAIL,
    }

    if(surveyUserAlreadyExist){
      variables.id = surveyUserAlreadyExist.id;
      await SendMailService.execute(email, survey.title, variables, npsMailPath);

      return res.json(surveyUserAlreadyExist);
    }

    const surveyUser = surveysUsersRepository.create({
      user_id: user.id,
      survey_id
    })

    await surveysUsersRepository.save(surveyUser);

    variables.id = surveyUser.id;

    await SendMailService.execute(email, survey.title, variables, npsMailPath);

    return res.json(surveyUser);
  }
}

export { SendMailController };
